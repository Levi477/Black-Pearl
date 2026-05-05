const { app, BrowserWindow, ipcMain, session, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { spawn } = require("child_process");
const Aria2 = require("aria2").default || require("aria2");
const { ElectronBlocker } = require("@cliqz/adblocker-electron");
const fetch = require("cross-fetch");

const Module = require("module");
const originalRequire = Module.prototype.require;
const sharedAxios = originalRequire.call(module, "axios");
let sharedCheerio;
try {
  sharedCheerio = originalRequire.call(module, "cheerio");
} catch (e) {}

Module.prototype.require = function (request) {
  if (request === "axios") return sharedAxios;
  if (request === "cheerio" && sharedCheerio) return sharedCheerio;
  return originalRequire.apply(this, arguments);
};

let mainWindow;
let adBlocker = null;

// --- EXTENSIONS & CACHE ---
const extensions = {};
let activeExt = null;
const pageCache = new Map();
const steamCache = new Map();
const userExtPath = path.join(app.getPath("userData"), "extensions");

function loadExtensions() {
  if (!fs.existsSync(userExtPath))
    fs.mkdirSync(userExtPath, { recursive: true });
  const builtinExtPath = app.isPackaged
    ? path.join(process.resourcesPath, "extensions")
    : path.join(__dirname, "../extensions");

  const loadFolder = (folderPath) => {
    if (!fs.existsSync(folderPath)) return;
    for (const file of fs.readdirSync(folderPath)) {
      if (file.endsWith(".js")) {
        try {
          const filePath = path.join(folderPath, file);
          delete require.cache[require.resolve(filePath)];
          const ext = require(filePath);
          extensions[ext.name] = ext;
        } catch (error) {
          console.error(`[Load Error] ${file}:`, error.message);
        }
      }
    }
  };
  loadFolder(builtinExtPath);
  loadFolder(userExtPath);
}

// --- DATABASE ---
const dbPath = path.join(app.getPath("userData"), "blackpearl_db.json");
function getDB() {
  if (!fs.existsSync(dbPath))
    fs.writeFileSync(
      dbPath,
      JSON.stringify({
        profile: {
          name: "User",
          avatar: "",
          downloadPath: app.getPath("downloads"),
        },
        wishlist: [],
        completedDownloads: [],
      }),
    );
  return JSON.parse(fs.readFileSync(dbPath));
}
function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// --- ARIA2 ENGINE ---
let aria2Process;
const aria2 = new Aria2({
  host: "localhost",
  port: 6800,
  secure: false,
  secret: "",
});
const activeGameMap = new Map();

function startAria2() {
  let binaryName =
    process.platform === "darwin"
      ? "aria2c"
      : process.platform === "linux"
        ? "aria2c-linux"
        : "aria2c.exe";
  const ariaPath = app.isPackaged
    ? path.join(process.resourcesPath, binaryName)
    : path.join(__dirname, "..", binaryName);
  if (fs.existsSync(ariaPath)) {
    aria2Process = spawn(ariaPath, [
      "--enable-rpc",
      "--rpc-listen-all=false",
      "--rpc-listen-port=6800",
      "--max-connection-per-server=16",
      "--split=16",
      "--continue=true",
    ]);
  }
}

// Poll Aria2 State
setInterval(async () => {
  if (mainWindow && aria2Process) {
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
          if (!db.completedDownloads.find((x) => x.gid === c.gid)) {
            db.completedDownloads.push({
              gid: c.gid,
              name: fileName,
              gameName: activeGameMap.get(c.gid) || fileName,
              date: new Date().toISOString(),
            });
            updated = true;
          }
          // FIX: Purge from Aria2 memory so it doesn't repopulate when user clears history
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
  }
}, 1000);

app.whenReady().then(async () => {
  loadExtensions();
  startAria2();
  setTimeout(async () => {
    try {
      await aria2.open();
    } catch (e) {}
  }, 1000);
  try {
    adBlocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
  } catch (e) {}
  createWindow();
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });
  if (process.env.VITE_DEV_SERVER_URL)
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  else mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
}
app.on("will-quit", () => {
  if (aria2Process) aria2Process.kill();
});

// --- IPC HANDLERS ---
const getCacheKey = (type, param, page) =>
  `${activeExt?.name}_${type}_${param}_${page}`;
ipcMain.handle("get-extensions", () => Object.keys(extensions));
ipcMain.handle("set-extension", (e, name) => {
  if (extensions[name]) activeExt = extensions[name];
  return {
    categories: activeExt?.categories || [],
    capabilities: activeExt?.capabilities || {},
  };
});
ipcMain.handle("get-homepage", async () => {
  const k = getCacheKey("home", "m", 1);
  if (pageCache.has(k)) return pageCache.get(k);
  const d = activeExt ? await activeExt.get_homepage_games() : [];
  pageCache.set(k, d);
  return d;
});
ipcMain.handle("get-category", async (e, { category, page }) => {
  const k = getCacheKey("cat", category, page);
  if (pageCache.has(k)) return pageCache.get(k);
  const d = activeExt
    ? await activeExt.get_games_by_category(category, page)
    : [];
  pageCache.set(k, d);
  return d;
});
ipcMain.handle("search-games", async (e, { query, page }) => {
  const k = getCacheKey("src", query, page);
  if (pageCache.has(k)) return pageCache.get(k);
  const d = activeExt ? await activeExt.search_games(query, page) : [];
  pageCache.set(k, d);
  return d;
});
ipcMain.handle("get-steam-media", async (e, gameName) => {
  if (steamCache.has(gameName)) return steamCache.get(gameName);
  try {
    const res = await axios.get(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName.split("Free Download")[0].trim())}&l=english&cc=US`,
    );
    if (!res.data.items?.length) return null;
    const detail = await axios.get(
      `https://store.steampowered.com/api/appdetails?appids=${res.data.items[0].id}`,
    );
    steamCache.set(gameName, detail.data[res.data.items[0].id].data);
    return steamCache.get(gameName);
  } catch (err) {
    return null;
  }
});
ipcMain.handle("install-extension", async (e, url) => {
  try {
    const res = await axios.get(url, { responseType: "text" });
    if (!res.data.includes("module.exports"))
      throw new Error("Invalid extension.");
    fs.writeFileSync(
      path.join(
        userExtPath,
        url.split("/").pop().split("?")[0] || `ext_${Date.now()}.js`,
      ),
      res.data,
    );
    loadExtensions();
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("select-directory", async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle("get-db", () => getDB());
ipcMain.handle("update-profile", (e, profile) => {
  let db = getDB();
  db.profile = profile;
  saveDB(db);
  return db;
});
ipcMain.handle("toggle-wishlist", (e, game) => {
  let db = getDB();
  const i = db.wishlist.findIndex((g) => g.name === game.name);
  if (i > -1) db.wishlist.splice(i, 1);
  else db.wishlist.push(game);
  saveDB(db);
  return db.wishlist;
});
ipcMain.handle("clear-completed", () => {
  let db = getDB();
  db.completedDownloads = [];
  saveDB(db);
  return db;
});

// --- DOWNLOAD CONTROLS & DELETION FIX ---
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
    const status = await aria2.call("tellStatus", gid); // Grab file info BEFORE canceling
    await aria2.call("forceRemove", gid);

    // FIX: Delete the residual files from the hard drive
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

// --- SMART INTERCEPTOR ---
ipcMain.on("start-smart-download", (event, hostUrl, gameName) => {
  const dlSession = session.fromPartition("persist:stealth_downloads");
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
      mainWindow.webContents.send("download-started", { gameName, fileName });
    } catch (err) {
      console.error(err);
    } finally {
      if (!downloadWin.isDestroyed()) downloadWin.close();
    }
  });
  downloadWin.loadURL(hostUrl);
});
