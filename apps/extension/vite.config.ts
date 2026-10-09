import { copyFileSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { READABLE_FONT_FILES } from "./src/shared/readable-font";

const FONT_PACKAGE = resolve(import.meta.dirname, "node_modules/@fontsource-variable/atkinson-hyperlegible-next");

/**
 * Builds the popup and the background service worker (an ES module). The
 * content script must be a classic script without imports, so it has its own
 * build in vite.content.config.ts.
 */
export default defineConfig({
  // Extension pages load from chrome-extension://<id>/, so asset URLs must be relative.
  base: "./",
  plugins: [
    tailwindcss(),
    {
      name: "copy-extension-manifest",
      closeBundle() {
        copyFileSync(resolve(import.meta.dirname, "manifest.json"), resolve(import.meta.dirname, "dist/manifest.json"));
      }
    },
    {
      // The readable font ships inside the extension, with its license.
      name: "copy-readable-font",
      generateBundle() {
        for (const file of READABLE_FONT_FILES) {
          const source = readFileSync(resolve(FONT_PACKAGE, "files", basename(file.path)));
          this.emitFile({ type: "asset", fileName: file.path, source });
        }
        this.emitFile({ type: "asset", fileName: "fonts/OFL.txt", source: readFileSync(resolve(FONT_PACKAGE, "LICENSE")) });
      }
    }
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(import.meta.dirname, "popup.html"),
        background: resolve(import.meta.dirname, "src/background.ts")
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    },
    // Chrome supports module preloading natively; the polyfill would only add code.
    modulePreload: { polyfill: false }
  }
});
