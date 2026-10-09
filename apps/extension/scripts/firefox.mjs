// Builds the Firefox version into dist-firefox: the same files as the Chrome
// and Edge build in dist, with the Firefox-specific manifest keys merged in.
import { cp, readFile, rm, writeFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const output = new URL("dist-firefox/", root);

await rm(output, { recursive: true, force: true });
await cp(new URL("dist/", root), output, { recursive: true });
const base = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));
const firefox = JSON.parse(await readFile(new URL("manifest.firefox.json", root), "utf8"));
await writeFile(new URL("manifest.json", output), `${JSON.stringify({ ...base, ...firefox }, null, 2)}\n`);
