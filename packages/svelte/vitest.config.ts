import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [svelte()],
  // Test against the core source, so a build of @clamly/anchor is not required.
  resolve: { alias: { "@clamly/anchor": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)) } },
  test: {
    // Svelte compiles components differently for the server and the browser.
    projects: [
      { extends: true, test: { name: "server", include: ["test/ssr.test.ts"], environment: "node" } },
      {
        extends: true,
        resolve: { conditions: ["browser"] },
        test: { name: "browser", include: ["test/client.test.ts"], environment: "jsdom" }
      }
    ]
  }
});
