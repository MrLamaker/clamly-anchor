// Svelte components ship as source: the app's Svelte compiler builds them for
// the server and the browser. Copy them next to index.js with their types. The
// declaration is written under both names TypeScript looks for: the Svelte
// convention "X.svelte.d.ts" (bundler resolution) and "X.d.svelte.ts" (node16).
import { copyFile } from "node:fs/promises";

const from = (file) => new URL(`../src/${file}`, import.meta.url);
const to = (file) => new URL(`../dist/${file}`, import.meta.url);

await copyFile(from("AnchorText.svelte"), to("AnchorText.svelte"));
await copyFile(from("AnchorText.svelte.d.ts"), to("AnchorText.svelte.d.ts"));
await copyFile(from("AnchorText.svelte.d.ts"), to("AnchorText.d.svelte.ts"));
