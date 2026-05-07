const { app } = require("electron");
const fs = require("fs");
const path = require("path");

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

function setupDatabaseIPC(ipcMain) {
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
}

module.exports = { getDB, saveDB, setupDatabaseIPC };