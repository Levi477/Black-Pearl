import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        // Tells Vite exactly where your main.js lives
        entry: "electron/main.js",
      },
      {
        // Tells Vite exactly where your preload lives
        entry: "electron/preload.js",
        onstart(options) {
          // Hot-reloads the Electron window if you change preload.js
          options.reload();
        },
      },
    ]),
  ],
});
