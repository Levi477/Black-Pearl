const { app, BrowserWindow, session } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const net = require("net");
const Aria2 = require("aria2").default || require("aria2");
const { getDB, saveDB } = require("./database");
const { scrapeDirectLink } = require("./scrapers/manager");

let aria2Process;
let aria2;
const activeGameMap = new Map();

// --- DYNAMIC PORT SCANNER ---
function findFreePort(startPort, maxPort = 6900) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        if (startPort < maxPort) {
          console.log(
            `[ARIA2] Port ${startPort} is busy, trying ${startPort + 1}...`,
          );
          resolve(findFreePort(startPort + 1, maxPort));
        } else {
          reject(new Error("No free ports available for Aria2"));
        }
      } else {
        reject(err);
      }
    });
    server.listen(startPort, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
  });
}

async function startAria2() {
  const binaryName =
    process.platform === "darwin"
      ? "aria2c"
      : process.platform === "linux"
        ? "aria2c-linux"
        : "aria2c.exe";

  const ariaPath = app.isPackaged
    ? path.join(process.resourcesPath, binaryName)
    : path.join(app.getAppPath(), binaryName);

  if (!fs.existsSync(ariaPath)) {
    console.error("ARIA2 BINARY NOT FOUND at:", ariaPath);
    return false;
  }

  try {
    const freePort = await findFreePort(6800);
    console.log(`[ARIA2] Found free port: ${freePort}`);

    aria2 = new Aria2({
      host: "127.0.0.1",
      port: freePort,
      secure: false,
      secret: "",
    });

    aria2Process = spawn(
      ariaPath,
      [
        "--enable-rpc",
        "--rpc-listen-all=false",
        `--rpc-listen-port=${freePort}`,
        "--max-connection-per-server=16",
        "--split=32",
        "--continue=true",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    aria2Process.stderr.on("data", (d) =>
      console.error("[ARIA2 ERR]", d.toString().trim()),
    );
    aria2Process.on("error", (err) => console.error("ARIA2 ERROR:", err));
    aria2Process.on("exit", (code) => console.log("ARIA2 EXIT:", code));

    return true;
  } catch (err) {
    console.error("FAILED TO START ARIA2:", err);
    return false;
  }
}

async function connectAria2(maxRetries = 15) {
  if (!aria2) return false;
  for (let i = 1; i <= maxRetries; i++) {
    try {
      await aria2.open();
      console.log(`[ARIA2] Connected successfully on port ${aria2.port}`);
      return true;
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  console.error("[ARIA2] Failed to connect after all retries");
  return false;
}

function startPolling(getMainWindow) {
  setInterval(async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow || !aria2Process || !aria2) return;

    try {
      const active = await aria2.call("tellActive");
      const waiting = await aria2.call("tellWaiting", 0, 100);
      const stopped = await aria2.call("tellStopped", 0, 100);
      const completed = stopped.filter((d) => d.status === "complete");

      if (completed.length > 0) {
        let db = getDB();
        let updated = false;

        for (const c of completed) {
          // BUG FIX: Ignore metadata file completions from torrents!
          // If followedBy is present, this gid was just a .torrent payload which spawned the real download
          if (c.followedBy && c.followedBy.length > 0) {
            const newGid = c.followedBy[0];
            const gameName = activeGameMap.get(c.gid);
            if (gameName) activeGameMap.set(newGid, gameName);

            try {
              await aria2.call("removeDownloadResult", c.gid);
            } catch (e) {}
            continue; // Skip adding to completedDownloads
          }

          const fileName =
            c.bittorrent?.info?.name ||
            c.files[0]?.path?.split(/[/\\]/).pop() ||
            "Unknown File";
          const gameName = activeGameMap.get(c.gid) || fileName;

          if (!db.completedDownloads.find((x) => x.gid === c.gid)) {
            db.completedDownloads.push({
              gid: c.gid,
              name: fileName,
              gameName,
              date: new Date().toISOString(),
            });
            updated = true;
          }

          try {
            await aria2.call("removeDownloadResult", c.gid);
          } catch (e) {}
        }

        if (updated) saveDB(db);
      }

      mainWindow.webContents.send(
        "download-update",
        [...active, ...waiting].map((d) => {
          let name = d.files[0]?.path?.split(/[/\\]/).pop() || "Resolving...";
          if (d.bittorrent && d.bittorrent.info && d.bittorrent.info.name) {
            name = d.bittorrent.info.name;
          }

          // Parse inner files for UI tracking
          const files = d.files
            ? d.files
                .filter((f) => f.path && f.selected === "true")
                .map((f) => ({
                  path: f.path.split(/[/\\]/).pop(),
                  completed: Number(f.completedLength || 0),
                  total: Number(f.length || 0),
                }))
            : [];

          return {
            gid: d.gid,
            gameName: activeGameMap.get(d.gid) || name,
            name: name,
            total: Number(d.totalLength || 0),
            completed: Number(d.completedLength || 0),
            speed: Number(d.downloadSpeed || 0),
            status: d.status,
            files: files,
            isTorrent: !!d.bittorrent,
          };
        }),
      );
    } catch (e) {}
  }, 1000);
}

function setupAria2IPC(ipcMain, getAdBlocker) {
  ipcMain.handle(
    "pause-download",
    async (e, gid) => await aria2.call("pause", gid),
  );
  ipcMain.handle(
    "resume-download",
    async (e, gid) => await aria2.call("unpause", gid),
  );
  ipcMain.handle("cancel-download", async (e, gid) => {
    try {
      const status = await aria2.call("tellStatus", gid);
      await aria2.call("forceRemove", gid);
      if (status && status.files) {
        status.files.forEach((f) => {
          if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
          const ariaFile = f.path + ".aria2";
          if (fs.existsSync(ariaFile)) fs.unlinkSync(ariaFile);
        });
      }
    } catch (err) {
      console.error("Cancel Error:", err);
    }
  });

  ipcMain.on("start-smart-download", async (event, hostUrl, gameName) => {
    const db = getDB();

    // REMOVED MULTIPART: Ensure it's treated strictly as a single string link
    const currentUrl = Array.isArray(hostUrl) ? hostUrl[0] : hostUrl;

    if (currentUrl.startsWith("magnet:")) {
      try {
        const gid = await aria2.call("addUri", [currentUrl], {
          dir: db.profile.downloadPath || app.getPath("downloads"),
        });
        activeGameMap.set(gid, gameName);
        event.sender.send("download-started", {
          gameName,
          fileName: "Torrent Download",
        });
      } catch (e) {
        console.error("Magnet error:", e);
      }
      return;
    }

    const scrapeResult = await scrapeDirectLink(currentUrl);
    if (scrapeResult) {
      let targetUrl = "";
      let customHeaders = [];

      if (typeof scrapeResult === "string") {
        targetUrl = scrapeResult;
      } else if (typeof scrapeResult === "object" && scrapeResult.url) {
        targetUrl = scrapeResult.url;
        customHeaders = scrapeResult.headers || [];
      }

      console.log("[Scraper] Success! Sending to Aria2:", targetUrl);
      const fileName =
        targetUrl.split("?")[0].split("/").pop() || "game_download";

      try {
        const ariaOptions = {
          dir: db.profile.downloadPath || app.getPath("downloads"),
          out: `[BlackPearl] ${fileName}`,
        };

        if (customHeaders.length > 0) {
          ariaOptions.header = customHeaders;
        }

        const gid = await aria2.call("addUri", [targetUrl], ariaOptions);

        activeGameMap.set(gid, gameName);
        event.sender.send("download-started", { gameName, fileName });

        return;
      } catch (err) {
        console.error(
          "[ARIA2] Direct download failed, falling back to window.",
        );
      }
    }

    console.log("[Scraper] Failed or unsupported. Opening Stealth Window.");

    const uniqueSessionId = `stealth_${Date.now()}_${Math.random()}`;
    const dlSession = session.fromPartition(uniqueSessionId);
    const adBlocker = getAdBlocker();
    if (adBlocker) adBlocker.enableBlockingInSession(dlSession);

    const realUA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    dlSession.setUserAgent(realUA);

    let downloadWin = new BrowserWindow({
      width: 1100,
      height: 750,
      show: true,
      title: "Black Pearl - Please solve captcha or click Download...",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: dlSession,
        disableBlinkFeatures: "AutomationControlled",
      },
    });

    downloadWin.webContents.setWindowOpenHandler(() => {
      return { action: "deny" };
    });

    downloadWin.webContents.on("did-start-navigation", () => {
      downloadWin.webContents
        .executeJavaScript(
          `
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
          Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
          Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] }); // Fake having browser plugins
      `,
        )
        .catch(() => {});
    });

    downloadWin.webContents.on("did-finish-load", () => {
      const injectedUI = `
        Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        if (!document.getElementById('bp-back-btn')) {
          const btn = document.createElement('button');
          btn.id = 'bp-back-btn';
          btn.innerHTML = '⬅ Go Back';
          btn.style.cssText = 'position:fixed; bottom:20px; left:20px; z-index:2147483647; padding:12px 20px; background:#ef4444; color:white; border:none; border-radius:8px; font-weight:bold; font-family:sans-serif; cursor:pointer; box-shadow:0 4px 10px rgba(0,0,0,0.5); font-size: 14px;';
          btn.onclick = (e) => { e.preventDefault(); window.history.back(); };
          document.body.appendChild(btn);
        }
      `;
      downloadWin.webContents.executeJavaScript(injectedUI).catch(() => {});
    });

    let hasIntercepted = false;
    dlSession.on("will-download", async (e, item) => {
      if (hasIntercepted) {
        e.preventDefault();
        return;
      }
      hasIntercepted = true;
      e.preventDefault();
      if (downloadWin.isDestroyed()) return;

      const directUrlItem = item.getURLChain().pop();
      const downloadedFileName = item.getFilename();

      try {
        const cookies = await dlSession.cookies.get({});
        const exactReferer = downloadWin.webContents.getURL();

        const gid = await aria2.call("addUri", [directUrlItem], {
          header: [
            `Cookie: ${cookies.map((c) => `${c.name}=${c.value}`).join("; ")}`,
            `User-Agent: ${realUA}`,
            `Referer: ${exactReferer}`,
          ],
          dir: db.profile.downloadPath || app.getPath("downloads"),
          out: `[BlackPearl] ${downloadedFileName}`,
        });
        activeGameMap.set(gid, gameName);
        event.sender.send("download-started", {
          gameName,
          fileName: downloadedFileName,
        });
      } catch (err) {
        console.error(err);
      } finally {
        if (!downloadWin.isDestroyed()) downloadWin.close();
      }
    });

    downloadWin.loadURL(currentUrl);
  });
}

function killAria2() {
  if (aria2Process) aria2Process.kill();
}

module.exports = {
  startAria2,
  connectAria2,
  startPolling,
  setupAria2IPC,
  killAria2,
};
