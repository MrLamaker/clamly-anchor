import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts" },
  // Svelte libraries are ES modules only; the component is compiled by the app.
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  platform: "neutral",
  external: [/\.svelte$/]
});
