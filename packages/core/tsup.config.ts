import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  // tsup's bundled rollup-plugin-dts does not yet support TypeScript 7.
  // Declarations are emitted by `tsc --emitDeclarationOnly` in the build
  // script, using the project compiler directly.
  dts: false,
  sourcemap: true,
  clean: true,
  target: "es2022"
});
