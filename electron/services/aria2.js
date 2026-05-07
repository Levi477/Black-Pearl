const { app, BrowserWindow, session } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const net = require("net"); 
const Aria2 = require("aria2").default || require("aria2");
const { getDB, saveDB } = require("./database");

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
          console.log(`[ARIA2] Port ${startPort} is busy, trying ${startPort + 1}...`);
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

    aria2Process.stdout.on("data", (d) =>
      console.log("[ARIA2]", d.toString().trim()),
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
          const fileName =
            c.files[0]?.path?.split(/[/\\]/).pop() || "Unknown File";
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
        [...active, ...waiting].map((d) => ({
          gid: d.gid,
          gameName:
            activeGameMap.get(d.gid) || d.files[0]?.path?.split(/[/\\]/).pop(),
          name: d.files[0]?.path?.split(/[/\\]/).pop() || "Resolving...",
          total: Number(d.totalLength || 0),
          completed: Number(d.completedLength || 0),
          speed: Number(d.downloadSpeed || 0),
          status: d.status,
        })),
      );
    } catch (e) {}
  }, 1000);
}

function setupAria2IPC(ipcMain, getAdBlocker) {
  ipcMain.handle("pause-download", async (e, gid) => await aria2.call("pause", gid));
  ipcMain.handle("resume-download", async (e, gid) => await aria2.call("unpause", gid));
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

  ipcMain.on("start-smart-download", (event, hostUrl, gameName) => {
    const dlSession = session.fromPartition("persist:stealth_downloads");
    const adBlocker = getAdBlocker();
    if (adBlocker) adBlocker.enableBlockingInSession(dlSession);

    let downloadWin = new BrowserWindow({
      width: 1000,
      height: 700,
      show: true,
      title: "Black Pearl - Please click 'Download' when ready...",
      webPreferences: { nodeIntegration: false, session: dlSession },
    });
    downloadWin.webContents.setWindowOpenHandler(({ url }) => {
      downloadWin.loadURL(url);
      return { action: "deny" };
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

      const directUrl = item.getURLChain().pop();
      const fileName = item.getFilename();
      const ua = downloadWin.webContents.getUserAgent();

      try {
        const cookies = await dlSession.cookies.get({});
        const db = getDB();
        
        // Use dynamically initialized aria2 client
        const gid = await aria2.call("addUri", [directUrl], {
          header: [
            `Cookie: ${cookies.map((c) => `${c.name}=${c.value}`).join("; ")}`,
            `User-Agent: ${ua}`,
            `Referer: ${hostUrl}`,
          ],
          dir: db.profile.downloadPath || app.getPath("downloads"),
          out: `[BlackPearl] ${fileName}`,
        });
        activeGameMap.set(gid, gameName);
        event.sender.send("download-started", { gameName, fileName });
      } catch (err) {
        console.error(err);
      } finally {
        if (!downloadWin.isDestroyed()) downloadWin.close();
      }
    });
    downloadWin.loadURL(hostUrl);
  });
}

function killAria2() {
  if (aria2Process) aria2Process.kill();
}

module.exports = { startAria2, connectAria2, startPolling, setupAria2IPC, killAria2 };