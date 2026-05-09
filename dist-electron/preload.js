//#region electron/preload.js
var { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("api", {
	getExtensions: () => ipcRenderer.invoke("get-extensions"),
	setExtension: (name) => ipcRenderer.invoke("set-extension", name),
	installExtension: (url) => ipcRenderer.invoke("install-extension", url),
	getHomepage: () => ipcRenderer.invoke("get-homepage"),
	getCategory: (category, page) => ipcRenderer.invoke("get-category", {
		category,
		page
	}),
	searchGames: (query, page) => ipcRenderer.invoke("search-games", {
		query,
		page
	}),
	getSteamMedia: (gameName) => ipcRenderer.invoke("get-steam-media", gameName),
	getGameDetails: (url) => ipcRenderer.invoke("get-game-details", url),
	startStream: (params) => ipcRenderer.send("stream-request", params),
	onStreamItem: (callback) => {
		ipcRenderer.removeAllListeners("stream-item");
		ipcRenderer.on("stream-item", (_event, game) => callback(game));
	},
	onStreamEnd: (callback) => {
		ipcRenderer.removeAllListeners("stream-end");
		ipcRenderer.on("stream-end", (_event, data) => callback(data));
	},
	selectDirectory: () => ipcRenderer.invoke("select-directory"),
	getDB: () => ipcRenderer.invoke("get-db"),
	updateProfile: (profile) => ipcRenderer.invoke("update-profile", profile),
	toggleWishlist: (game) => ipcRenderer.invoke("toggle-wishlist", game),
	clearCompleted: () => ipcRenderer.invoke("clear-completed"),
	registerMultipart: (gameName, totalParts) => ipcRenderer.invoke("register-multipart", {
		gameName,
		totalParts
	}),
	addToLibrary: (game) => ipcRenderer.invoke("add-to-library", game),
	removeFromLibrary: (gameName) => ipcRenderer.invoke("remove-from-library", gameName),
	setGameExe: (gameName, exePath) => ipcRenderer.invoke("set-game-exe", {
		gameName,
		exePath
	}),
	setLaunchParams: (gameName, params) => ipcRenderer.invoke("set-launch-params", {
		gameName,
		params
	}),
	openGameFolder: (exePath) => ipcRenderer.invoke("open-game-folder", exePath),
	selectExe: () => ipcRenderer.invoke("select-exe"),
	launchGame: (gameName, exePath, launchParams) => ipcRenderer.invoke("launch-game", {
		gameName,
		exePath,
		launchParams
	}),
	killGame: (gameName) => ipcRenderer.invoke("kill-game", gameName),
	startSmartDownload: (url, gameName) => ipcRenderer.send("start-smart-download", url, gameName),
	pauseDownload: (gid) => ipcRenderer.invoke("pause-download", gid),
	resumeDownload: (gid) => ipcRenderer.invoke("resume-download", gid),
	cancelDownload: (gid) => ipcRenderer.invoke("cancel-download", gid),
	checkPartExists: (url) => ipcRenderer.invoke("check-part-exists", url),
	onDownloadUpdate: (callback) => {
		ipcRenderer.removeAllListeners("download-update");
		ipcRenderer.on("download-update", (_event, data) => callback(data));
	},
	onDownloadStarted: (callback) => {
		ipcRenderer.removeAllListeners("download-started");
		ipcRenderer.on("download-started", (_event, data) => callback(data));
	},
	onGameStarted: (callback) => {
		ipcRenderer.removeAllListeners("game-started");
		ipcRenderer.on("game-started", (_event, gameName) => callback(gameName));
	},
	onGameExited: (callback) => {
		ipcRenderer.removeAllListeners("game-exited");
		ipcRenderer.on("game-exited", (_event, gameName) => callback(gameName));
	},
	minimizeWindow: () => ipcRenderer.send("window-minimize"),
	maximizeWindow: () => ipcRenderer.send("window-maximize"),
	closeWindow: () => ipcRenderer.send("window-close"),
	openExternal: (url) => ipcRenderer.send("open-external", url)
});
//#endregion
