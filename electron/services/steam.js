const { app } = require("electron");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const steamCache = new Map();
let steamCachePath = null;

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

function setupSteamIPC(ipcMain) {
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
}

module.exports = { loadSteamCache, setupSteamIPC };