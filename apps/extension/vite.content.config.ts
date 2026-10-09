import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * Content scripts are classic scripts and cannot import other files, so this
 * build bundles the content script and everything it uses (the Anchor engine
 * and the shared settings) into one self-contained IIFE: dist/content.js.
 */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, "src/content.ts"),
      formats: ["iife"],
      name: "ClamlyAnchorContent",
      fileName: () => "content.js"
    }
  }
});
