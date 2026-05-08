const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const extensions = {};
let activeExt = null;
const pageCache = new Map();

function loadExtensions() {
  const userExtPath = path.join(app.getPath("userData"), "extensions");
  if (!fs.existsSync(userExtPath))
    fs.mkdirSync(userExtPath, { recursive: true });
    
  const builtinExtPath = app.isPackaged
    ? path.join(process.resourcesPath, "extensions")
    : path.join(__dirname, "../../extensions");

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

function setupExtensionsIPC(ipcMain) {

  ipcMain.handle("get-game-details", async (e, url) => {
    if (activeExt && activeExt.get_game_details) {
      return await activeExt.get_game_details(url);
    }
    return { download_links: [] };
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

  ipcMain.handle("install-extension", async (e, url) => {
    const userExtPath = path.join(app.getPath("userData"), "extensions");
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
}

module.exports = { loadExtensions, setupExtensionsIPC };