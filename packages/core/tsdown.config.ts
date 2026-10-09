import { defineConfig, type UserConfig } from "tsdown";

const browserGlobal = (entry: Record<string, string>): UserConfig => ({
  entry,
  // A classic script for <script src> tags and CDNs, with no imports.
  format: "iife",
  globalName: "ClamlyAnchor",
  platform: "browser",
  target: "es2020",
  minify: true,
  sourcemap: true,
  dts: false,
  clean: false,
  outputOptions: { entryFileNames: "[name].js" }
});

export default defineConfig([
  {
    entry: { index: "src/index.ts", element: "src/element.ts", toggle: "src/toggle.ts" },
    // ES modules for bundlers and modern Node, CommonJS for older toolchains.
    // Each format gets its own declaration files (.d.ts / .d.cts), so TypeScript
    // resolves correct types under every moduleResolution setting.
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    // scripts/clean.mjs empties dist once before all builds run.
    clean: false,
    target: "es2022",
    platform: "neutral",
    // One output file per source module: bundlers drop whole modules an app does not use.
    unbundle: true
  },
  browserGlobal({ "anchor.global": "src/global.ts" }),
  browserGlobal({ "anchor.auto.global": "src/auto.ts" })
]);
