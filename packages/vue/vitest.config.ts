import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Test against the core source, so a build of @clamly/anchor is not required.
  resolve: { alias: { "@clamly/anchor": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)) } },
  test: { environment: "jsdom" }
});
