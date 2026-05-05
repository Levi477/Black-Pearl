const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

let mainWindow;
const extensions = {};
let activeExt = null;
const steamCache = new Map();

function loadExtensions() {
  const extPath = path.join(__dirname, "../extensions");
  fs.readdirSync(extPath).forEach((file) => {
    if (file.endsWith(".js")) {
      const ext = require(path.join(extPath, file));
      extensions[ext.name] = ext;
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadURL("http://localhost:5173");
}

app.whenReady().then(() => {
  loadExtensions();
  createWindow();
});

// --- IPC HANDLERS ---
ipcMain.handle("get-extensions", () => Object.keys(extensions));

ipcMain.handle("set-extension", (e, name) => {
  if (!extensions[name]) return null;
  activeExt = extensions[name];
  // Send back both categories and capabilities
  return {
    categories: activeExt.categories || [],
    capabilities: activeExt.capabilities || {
      hasCategoryPagination: false,
      hasSearchPagination: false,
    },
  };
});
ipcMain.handle(
  "get-homepage",
  async () => await activeExt.get_homepage_games(),
);
ipcMain.handle(
  "get-category",
  async (e, { category, page }) =>
    await activeExt.get_games_by_category(category, page),
);
ipcMain.handle(
  "search-games",
  async (e, { query, page }) => await activeExt.search_games(query, page),
);

ipcMain.handle("get-steam-media", async (e, gameName) => {
  if (steamCache.has(gameName)) {
    return steamCache.get(gameName);
  }

  try {
    const cleanName = gameName.split("Free Download")[0].trim();
    const searchRes = await axios.get(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanName)}&l=english&cc=US`,
    );

    if (!searchRes.data.items?.length) return null;

    const appId = searchRes.data.items[0].id;
    const detailRes = await axios.get(
      `https://store.steampowered.com/api/appdetails?appids=${appId}`,
    );

    const result = detailRes.data[appId].data;

    steamCache.set(gameName, result);
    return result;
  } catch (err) {
    return null;
  }
});
