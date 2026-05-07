require('v8-compile-cache');
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
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
  console.log("[App] Ready — initializing modules...");

  // Synchronous tasks
  loadExtensions();
  loadSteamCache();
  createWindow();

  // Route IPC Handlers to Services (Pass active states as callbacks)
  setupDatabaseIPC(ipcMain);
  setupSteamIPC(ipcMain);
  setupExtensionsIPC(ipcMain);
  setupLauncherIPC(ipcMain, () => mainWindow);
  setupAria2IPC(ipcMain, () => adBlocker);

  // Background processes
  const started = startAria2();
  if (started) {
    connectAria2().then((ok) => {
      if (ok) {
        console.log("[App] Aria2 background init complete");
        startPolling(() => mainWindow);
      }
    });
  }

  ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)
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