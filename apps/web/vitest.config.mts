import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const source = (path: string): string => fileURLToPath(new URL(`../../packages/${path}`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Test against the package sources, as the typecheck does, so nothing needs building first.
  resolve: {
    alias: [
      { find: /^@clamly\/anchor$/, replacement: source("core/src/index.ts") },
      { find: /^@clamly\/anchor\/toggle$/, replacement: source("core/src/toggle.ts") },
      { find: /^@clamly\/anchor-react$/, replacement: source("react/src/index.ts") }
    ]
  },
  test: { include: ["test/**/*.test.{ts,tsx}"] }
});
