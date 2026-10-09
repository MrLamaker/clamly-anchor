import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  platform: "neutral",
  unbundle: true,
  // The plugin is the default export, as unified expects; CommonJS users can
  // also require the named export: require("@clamly/rehype-anchor").rehypeAnchor.
  outputOptions: { exports: "named" }
});
