import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  platform: "neutral",
  // Keeps "use client" at the top of client.js, so Next.js and other RSC
  // frameworks treat only the hooks as client code; AnchorText stays server-safe.
  unbundle: true
});
