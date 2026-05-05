const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getExtensions: () => ipcRenderer.invoke("get-extensions"),
  setExtension: (name) => ipcRenderer.invoke("set-extension", name),
  getHomepage: () => ipcRenderer.invoke("get-homepage"),
  getCategory: (category, page) =>
    ipcRenderer.invoke("get-category", { category, page }),
  searchGames: (query, page) =>
    ipcRenderer.invoke("search-games", { query, page }),
  getSteamMedia: (gameName) => ipcRenderer.invoke("get-steam-media", gameName),
});
