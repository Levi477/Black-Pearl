require('v8-compile-cache');
const { app, BrowserWindow, ipcMain, dialog,shell } = require("electron");
const path = require("path");
const fetch = require("cross-fetch");
const { ElectronBlocker } = require("@cliqz/adblocker-electron");

// --- Global Request Hooking ---
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

// --- Import Services ---
const { setupDatabaseIPC } = require("./services/database");
const { loadSteamCache, setupSteamIPC } = require("./services/steam");
const { loadExtensions, setupExtensionsIPC } = require("./services/extensions");
const { setupLauncherIPC, killAllGames } = require("./services/launcher");
const {
  startAria2,
  connectAria2,
  startPolling,
  setupAria2IPC,
  killAria2,
} = require("./services/aria2");

let mainWindow;
let adBlocker = null;

if (process.platform === "win32") {
  app.commandLine.appendSwitch("disable-direct-composition");
  app.commandLine.appendSwitch("disable-direct-composition-video-overlays");
}

app.whenReady().then(async () => {
  console.log("[App] Ready initializing modules...");

  loadExtensions();
  loadSteamCache();
  createWindow();

  setupDatabaseIPC(ipcMain);
  setupSteamIPC(ipcMain);
  setupExtensionsIPC(ipcMain);
  setupLauncherIPC(ipcMain, () => mainWindow);
  setupAria2IPC(ipcMain, () => adBlocker);

// Background processes 
  startAria2().then((started) => {
    if (started) {
      connectAria2().then((ok) => {
        if (ok) {
          console.log("[App] Aria2 background init complete");
          startPolling(() => mainWindow);
        }
      });
    }
  });
  ElectronBlocker.fromLists(fetch, [
      "https://easylist.to/easylist/easylist.txt",
      "https://easylist.to/easylist/easyprivacy.txt",
      "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
      "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt",
      "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt",
      "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt",
      "https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=1&mimetype=plaintext"
    ])
    .then((b) => {
      adBlocker = b;
      console.log("[App] AdBlocker ready");
    })
    .catch((e) => console.error("[App] AdBlocker failed:", e));
});



function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: false,
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      backgroundThrottling: true
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.on("will-quit", () => {
  killAria2();
  killAllGames();
});

ipcMain.handle("select-directory", async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.on("open-external", (event, url) => {
  shell.openExternal(url);
});
ipcMain.on("window-minimize", () => mainWindow.minimize());
ipcMain.on("window-maximize", () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on("window-close", () => mainWindow.close());

ipcMain.handle("check-part-exists", (e, url) => {
  try {
    const { getDB } = require("./services/database");
    const db = getDB();
    const rawName = url.split("?")[0].split("/").pop();
    if (!rawName) return false;
    
    const fileName = rawName.startsWith("[BlackPearl]") ? rawName : `[BlackPearl] ${rawName}`;
    const dlPath = db.profile?.downloadPath || app.getPath("downloads");
    
    return fs.existsSync(path.join(dlPath, fileName));
  } catch (err) {
    return false;
  }
});