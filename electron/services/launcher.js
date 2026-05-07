const { app, shell, dialog } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const { getDB } = require("./database");

const activeGameProcesses = new Map();

// Pass getMainWindow as a callback to always interact with the active window
function setupLauncherIPC(ipcMain, getMainWindow) {
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

    const mainWindow = getMainWindow();
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
      // Regex parsing for launch params to respect quoted paths
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
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("game-exited", gameName);
        }
      };

      proc.on("exit", cleanup);
      proc.on("error", (err) => {
        console.error(`[Launcher] Error launching ${gameName}:`, err);
        cleanup(-1);
      });

      const mainWindow = getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("game-started", gameName);
        mainWindow.minimize(); // Auto-minimize window
      }

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
      const mainWindow = getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("game-exited", gameName);
      }
    }
    return true;
  });
}

function killAllGames() {
  activeGameProcesses.forEach((proc) => {
    try {
      proc.kill();
    } catch (e) {}
  });
}

module.exports = { setupLauncherIPC, killAllGames };