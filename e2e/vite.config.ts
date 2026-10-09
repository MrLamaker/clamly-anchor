import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Serves the fixture pages. They import the built packages (run `pnpm build`
// first), so the tests exercise exactly what is published. The core package's
// dist folder is the public directory, which serves the script-tag builds at
// /anchor.global.js and /anchor.auto.global.js.
export default defineConfig({
  root: fileURLToPath(new URL("fixtures", import.meta.url)),
  publicDir: fileURLToPath(new URL("../packages/core/dist", import.meta.url)),
  plugins: [react(), svelte()],
  // Pre-bundling `svelte` merges its client and server entries into a module
  // without the client exports; Svelte's own ES modules work as they are.
  optimizeDeps: { exclude: ["svelte"] },
  server: { port: 5174, strictPort: true },
  logLevel: "warn"
});
