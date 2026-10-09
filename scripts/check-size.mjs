// Bundle-size limits for what apps actually ship. Each scenario is bundled,
// tree-shaken, minified and gzipped the way a production build would, so the
// numbers reflect real cost rather than the size of the files on disk.
// Run `pnpm build` first.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
// Any workspace package that depends on @clamly/anchor can resolve its subpath exports.
const resolveDir = `${root}apps/web`;

const scenarios = [
  { name: "splitText (framework components, SSR)", code: 'export { splitText } from "@clamly/anchor";', limit: 4.4 },
  { name: "processText (HTML output)", code: 'export { processText } from "@clamly/anchor";', limit: 4.5 },
  { name: "createAnchor (live pages)", code: 'export { createAnchor } from "@clamly/anchor";', limit: 10.8 },
  {
    name: "createAnchor + toggle",
    code: 'export { createAnchor } from "@clamly/anchor"; export { createAnchorToggle } from "@clamly/anchor/toggle";',
    limit: 12
  },
  { name: "everything in @clamly/anchor", code: 'export * from "@clamly/anchor";', limit: 12 },
  { name: "dist/anchor.auto.global.js (script tag)", file: "packages/core/dist/anchor.auto.global.js", limit: 12.5 },
  { name: "dist/anchor.global.js (script tag)", file: "packages/core/dist/anchor.global.js", limit: 14 }
];

let failed = false;
for (const scenario of scenarios) {
  let code;
  if (scenario.file) {
    code = readFileSync(`${root}${scenario.file}`);
  } else {
    const result = await build({
      stdin: { contents: scenario.code, resolveDir, loader: "js" },
      bundle: true,
      minify: true,
      format: "esm",
      platform: "browser",
      write: false,
      logLevel: "silent"
    });
    code = result.outputFiles[0].contents;
  }
  const size = gzipSync(code, { level: 9 }).length / 1024;
  const ok = size <= scenario.limit;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} ${scenario.name.padEnd(42)} ${size.toFixed(2).padStart(6)} KB gzipped (limit ${scenario.limit} KB)`);
}
if (failed) {
  console.error("\nA bundle is over its size limit. Keep it lean, or raise the limit in scripts/check-size.mjs with a reason.");
  process.exit(1);
}
