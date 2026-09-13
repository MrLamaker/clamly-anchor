import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

/** Builds the popup and a manifest-addressable content-script entry in one pass. */
export default defineConfig({
  // Extension pages are loaded from chrome-extension://<id>/ rather than a web
  // server. Relative asset URLs keep the generated popup portable when it is
  // loaded unpacked or bundled into a .zip for release.
  base: "./",
  plugins: [
    tailwindcss(),
    {
      name: "copy-extension-manifest",
      closeBundle() {
        copyFileSync(resolve(import.meta.dirname, "manifest.json"), resolve(import.meta.dirname, "dist/manifest.json"));
      }
    }
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(import.meta.dirname, "popup.html"),
        content: resolve(import.meta.dirname, "src/content.ts"),
        background: resolve(import.meta.dirname, "src/background.ts")
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    },
    // The popup has a single self-contained entry. Chrome does not need Vite's
    // browser compatibility module-preload shim, which also avoids injecting
    // unrelated bootstrap code into the production popup bundle.
    modulePreload: { polyfill: false }
  }
});
