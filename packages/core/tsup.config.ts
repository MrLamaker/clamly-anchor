import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  // tsup's bundled rollup-plugin-dts does not yet support TypeScript 7.
  // Declarations are emitted by `tsc --emitDeclarationOnly` in the build
  // script, using the project compiler directly.
  dts: false,
  sourcemap: true,
  // Keep the previous output available while a dependent workspace is
  // resolving this package during concurrent monorepo builds.
  clean: false,
  target: "es2022"
});
