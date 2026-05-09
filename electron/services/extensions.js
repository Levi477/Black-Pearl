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

  // ── Batch endpoints (kept for backward compat / load-more pagination) ──────

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

  // ── Streaming endpoint ────────────────────────────────────────────────────
  // The renderer sends "stream-request" and receives "stream-item" events
  // per game, followed by a single "stream-end" event.

  ipcMain.on("stream-request", async (event, { type, params = {} }) => {
    if (!activeExt) {
      if (!event.sender.isDestroyed())
        event.sender.send("stream-end", { type, params, total: 0, hasMore: false });
      return;
    }

    const supportsStreaming = !!activeExt.capabilities?.hasStreaming;

    // Helper that safely sends one game to the renderer
    const sendItem = (game) => {
      if (!event.sender.isDestroyed())
        event.sender.send("stream-item", game);
    };

    // Build the cache key so we can serve from cache without re-scraping
    let cacheKey;
    if (type === "homepage") cacheKey = getCacheKey("home", "m", 1);
    else if (type === "category") cacheKey = getCacheKey("cat", params.category, params.page || 1);
    else if (type === "search")   cacheKey = getCacheKey("src", params.query,    params.page || 1);

    // Serve from page-cache when available (instant, no re-scrape)
    if (cacheKey && pageCache.has(cacheKey)) {
      const cached = pageCache.get(cacheKey);
      for (const game of cached) sendItem(game);
      if (!event.sender.isDestroyed()) {
        event.sender.send("stream-end", {
          type, params, total: cached.length, fromCache: true,
          hasMore: type !== "homepage" && cached.length > 0 &&
            (type === "category"
              ? !!activeExt.capabilities?.hasCategoryPagination
              : !!activeExt.capabilities?.hasSearchPagination),
        });
      }
      return;
    }

    // Live scrape — stream items as they arrive (or emit in batch afterwards)
    const accumulated = [];

    const onGame = (game) => {
      accumulated.push(game);
      sendItem(game);
    };

    try {
      if (type === "homepage") {
        if (supportsStreaming) {
          await activeExt.get_homepage_games(onGame);
        } else {
          const res = await activeExt.get_homepage_games();
          for (const g of (res || [])) onGame(g);
        }
      } else if (type === "category") {
        if (supportsStreaming) {
          await activeExt.get_games_by_category(params.category, params.page || 1, onGame);
        } else {
          const res = await activeExt.get_games_by_category(params.category, params.page || 1);
          for (const g of (res || [])) onGame(g);
        }
      } else if (type === "search") {
        if (supportsStreaming) {
          await activeExt.search_games(params.query, params.page || 1, onGame);
        } else {
          const res = await activeExt.search_games(params.query, params.page || 1);
          for (const g of (res || [])) onGame(g);
        }
      }

      // Cache the accumulated result
      if (cacheKey && accumulated.length > 0) pageCache.set(cacheKey, accumulated);

      if (!event.sender.isDestroyed()) {
        event.sender.send("stream-end", {
          type, params,
          total: accumulated.length,
          fromCache: false,
          hasMore: type !== "homepage" && accumulated.length > 0 &&
            (type === "category"
              ? !!activeExt.capabilities?.hasCategoryPagination
              : !!activeExt.capabilities?.hasSearchPagination),
        });
      }
    } catch (err) {
      console.error("[Stream] Error during scrape:", err.message);
      if (!event.sender.isDestroyed()) {
        event.sender.send("stream-end", {
          type, params, total: accumulated.length, error: err.message, hasMore: false,
        });
      }
    }
  });

  // ── Extension installer ───────────────────────────────────────────────────

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