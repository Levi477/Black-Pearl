const {
  app,
  BrowserWindow,
  ipcMain,
  session,
  dialog,
  shell,
} = require("electron");
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

if (process.platform === "win32") {
  app.commandLine.appendSwitch("disable-direct-composition");
  app.commandLine.appendSwitch("disable-direct-composition-video-overlays");
}

const extensions = {};
let activeExt = null;
const pageCache = new Map();
const steamCache = new Map();
let steamCachePath = null;

const activeGameMap = new Map();
const activeGameProcesses = new Map();

const userExtPath = path.join(app.getPath("userData"), "extensions");

// --- STEAM CACHE PERSISTENCE ---
function loadSteamCache() {
  try {
    steamCachePath = path.join(app.getPath("userData"), "steam_cache.json");
    if (fs.existsSync(steamCachePath)) {
      const data = JSON.parse(fs.readFileSync(steamCachePath, "utf8"));
      let count = 0;
      Object.entries(data).forEach(([k, v]) => {
        steamCache.set(k, v);
        count++;
      });
      console.log(`[SteamCache] Loaded ${count} cached entries`);
    }
  } catch (e) {
    console.error("[SteamCache] Load error:", e.message);
  }
}

function saveSteamCache() {
  if (!steamCachePath) return;
  try {
    const obj = Object.fromEntries(steamCache);
    fs.writeFileSync(steamCachePath, JSON.stringify(obj));
  } catch (e) {
    console.error("[SteamCache] Save error:", e.message);
  }
}

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
const themesPath = path.join(app.getPath("userData"), "custom_themes.json");

function getCustomThemes() {
  if (!fs.existsSync(themesPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(themesPath));
  } catch (e) {
    return [];
  }
}

const dbPath = path.join(app.getPath("userData"), "blackpearl_db.json");

function getDB() {
  const defaults = {
    profile: {
      name: "User",
      avatar: "",
      downloadPath: app.getPath("downloads"),
      liteMode: false,
    },
    wishlist: [],
    completedDownloads: [],
    library: [],
  };

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaults));
    return defaults;
  }

  try {
    const data = JSON.parse(fs.readFileSync(dbPath));
    if (!data.library) data.library = [];
    return data;
  } catch (e) {
    return defaults;
  }
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// --- ARIA2 ENGINE ---
let aria2Process;

const aria2 = new Aria2({
  host: "127.0.0.1",
  port: 6800,
  secure: false,
  secret: "",
});

function startAria2() {
  const binaryName =
    process.platform === "darwin"
      ? "aria2c"
      : process.platform === "linux"
        ? "aria2c-linux"
        : "aria2c.exe";

  const ariaPath = app.isPackaged
    ? path.join(process.resourcesPath, binaryName)
    : path.join(__dirname, "..", binaryName);

  if (!fs.existsSync(ariaPath)) {
    console.error("ARIA2 BINARY NOT FOUND at:", ariaPath);
    return false;
  }

  try {
    aria2Process = spawn(
      ariaPath,
      [
        "--enable-rpc",
        "--rpc-listen-all=false",
        "--rpc-listen-port=6800",
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
  for (let i = 1; i <= maxRetries; i++) {
    try {
      await aria2.open();
      console.log("[ARIA2] Connected successfully");
      return true;
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  console.error("[ARIA2] Failed to connect after all retries");
  return false;
}

// --- POLLING ---
setInterval(async () => {
  if (!mainWindow || !aria2Process) return;

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

// --- APP READY ---
app.whenReady().then(async () => {
  console.log("[App] Ready — initializing...");

  loadExtensions();
  loadSteamCache();
  createWindow();

  const started = startAria2();
  if (started) {
    connectAria2().then((ok) => {
      if (ok) console.log("[App] Aria2 background init complete");
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
  activeGameProcesses.forEach((proc) => {
    try {
      proc.kill();
    } catch (e) {}
  });
});

// --- IPC HANDLERS ---
ipcMain.handle("get-custom-themes", () => getCustomThemes());

ipcMain.handle("install-theme", async (e, url) => {
  try {
    const res = await axios.get(url);
    const newTheme =
      typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    if (!newTheme.id || !newTheme.color)
      throw new Error("Invalid theme JSON format.");
    let customThemes = getCustomThemes();
    customThemes = customThemes.filter((t) => t.id !== newTheme.id);
    customThemes.push(newTheme);
    fs.writeFileSync(themesPath, JSON.stringify(customThemes, null, 2));
    return { success: true, theme: newTheme };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

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
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
        gameName.split("Free Download")[0].trim(),
      )}&l=english&cc=US`,
    );
    if (!res.data.items?.length) return null;
    const detail = await axios.get(
      `https://store.steampowered.com/api/appdetails?appids=${res.data.items[0].id}`,
    );
    const data = detail.data[res.data.items[0].id].data;
    steamCache.set(gameName, data);
    saveSteamCache();
    return data;
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

// --- LIBRARY ---
ipcMain.handle("add-to-library", (e, game) => {
  let db = getDB();
  if (!db.library.find((g) => g.name === game.name)) {
    db.library.push({
      ...game,
      exePath: null,
      launchParams: "",
      addedDate: new Date().toISOString(),
    });
    saveDB(db);
  }
  return db.library;
});

ipcMain.handle("remove-from-library", (e, gameName) => {
  let db = getDB();
  db.library = db.library.filter((g) => g.name !== gameName);
  saveDB(db);
  return db.library;
});

ipcMain.handle("set-game-exe", (e, { gameName, exePath }) => {
  let db = getDB();
  const game = db.library.find((g) => g.name === gameName);
  if (game) {
    game.exePath = exePath;
    saveDB(db);
  }
  return db.library;
});

ipcMain.handle("set-launch-params", (e, { gameName, params }) => {
  let db = getDB();
  const game = db.library.find((g) => g.name === gameName);
  if (game) {
    game.launchParams = params;
    saveDB(db);
  }
  return db.library;
});

// --- GAME LAUNCHER ---
ipcMain.handle("open-game-folder", async (e, exePath) => {
  const folderPath = exePath
    ? path.dirname(exePath)
    : getDB().profile.downloadPath || app.getPath("downloads");
  const result = await shell.openPath(folderPath);
  return !result;
});

ipcMain.handle("select-exe", async () => {
  const isWin = process.platform === "win32";
  const isMac = process.platform === "darwin";
  const filters = isWin
    ? [
        { name: "Executables", extensions: ["exe"] },
        { name: "All Files", extensions: ["*"] },
      ]
    : isMac
      ? [
          { name: "Applications", extensions: ["app"] },
          { name: "Shell Scripts", extensions: ["sh"] },
          { name: "All Files", extensions: ["*"] },
        ]
      : [
          { name: "All Files", extensions: ["*"] },
          { name: "Shell Scripts", extensions: ["sh"] },
        ];

  const r = await dialog.showOpenDialog(mainWindow, {
    title: "Select Game Executable",
    properties: ["openFile"],
    filters,
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle("launch-game", async (e, { gameName, exePath, launchParams }) => {
  if (activeGameProcesses.has(gameName)) {
    return { success: false, message: "Game is already running" };
  }

  try {
    let proc;
    // Safely split arguments by spaces, but ignoring spaces inside quotes
    const args = launchParams 
      ? launchParams.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(s => s.replace(/(^"|"$)/g, '')) || [] 
      : [];

    if (process.platform === "darwin" && exePath.endsWith(".app")) {
      proc = spawn("open", [exePath, "--args", ...args], { stdio: "ignore" });
    } else {
      proc = spawn(exePath, args, {
        stdio: "ignore",
        cwd: path.dirname(exePath),
      });
    }

    activeGameProcesses.set(gameName, proc);

    const cleanup = (code) => {
      console.log(`[Launcher] ${gameName} exited (code ${code})`);
      activeGameProcesses.delete(gameName);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("game-exited", gameName);
      }
    };

    proc.on("exit", cleanup);
    proc.on("error", (err) => {
      console.error(`[Launcher] Error launching ${gameName}:`, err);
      cleanup(-1);
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("game-started", gameName);
    }

    mainWindow.minimize();

    return { success: true };
  } catch (err) {
    console.error("[Launcher] Launch error:", err);
    return { success: false, message: err.message };
  }
});

ipcMain.handle("kill-game", async (e, gameName) => {
  const proc = activeGameProcesses.get(gameName);
  if (proc) {
    try {
      if (process.platform === "win32" && proc.pid) {
        spawn("taskkill", ["/pid", proc.pid, "/f", "/t"]);
      } else {
        proc.kill();
      }
    } catch (err) {
      console.error("[Launcher] Kill error:", err);
    }
    
    activeGameProcesses.delete(gameName);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("game-exited", gameName);
    }
  }
  return true;
});

// --- DOWNLOAD CONTROLS ---
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