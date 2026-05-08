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
        entry: "electron/main.js",
        vite: {
          build: {
            minify: false,
            rollupOptions: {
              external: ["axios", "cheerio"], 
            },
          },
        },
      },
      {
        entry: "electron/preload.js",
        onstart(options) {
          options.reload();
        },
      },
    ]),
  ],
});