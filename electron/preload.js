const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getCustomThemes: () => ipcRenderer.invoke("get-custom-themes"),
  installTheme: (url) => ipcRenderer.invoke("install-theme", url),
  getExtensions: () => ipcRenderer.invoke("get-extensions"),
  setExtension: (name) => ipcRenderer.invoke("set-extension", name),
  getHomepage: () => ipcRenderer.invoke("get-homepage"),
  getCategory: (category, page) =>
    ipcRenderer.invoke("get-category", { category, page }),
  searchGames: (query, page) =>
    ipcRenderer.invoke("search-games", { query, page }),
  getSteamMedia: (gameName) => ipcRenderer.invoke("get-steam-media", gameName),
  installExtension: (url) => ipcRenderer.invoke("install-extension", url),

  selectDirectory: () => ipcRenderer.invoke("select-directory"),
  getDB: () => ipcRenderer.invoke("get-db"),
  updateProfile: (profile) => ipcRenderer.invoke("update-profile", profile),
  toggleWishlist: (game) => ipcRenderer.invoke("toggle-wishlist", game),
  clearCompleted: () => ipcRenderer.invoke("clear-completed"),

  startSmartDownload: (url, gameName) =>
    ipcRenderer.send("start-smart-download", url, gameName),
  pauseDownload: (gid) => ipcRenderer.invoke("pause-download", gid),
  resumeDownload: (gid) => ipcRenderer.invoke("resume-download", gid),
  cancelDownload: (gid) => ipcRenderer.invoke("cancel-download", gid),

  onDownloadUpdate: (callback) => {
    ipcRenderer.removeAllListeners("download-update");
    ipcRenderer.on("download-update", (event, data) => callback(data));
  },

  // NEW: Triggers the toast notification
  onDownloadStarted: (callback) => {
    ipcRenderer.removeAllListeners("download-started");
    ipcRenderer.on("download-started", (event, data) => callback(data));
  },
});
