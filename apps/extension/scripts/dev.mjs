// Rebuilds the extension on every change. Both builds watch at once, which a
// plain "&" in package.json cannot do portably on Windows.
import { fileURLToPath } from "node:url";
import { build } from "vite";

const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const root = path("..");
await build({ root, configFile: path("../vite.config.ts"), build: { watch: {} } });
await build({ root, configFile: path("../vite.content.config.ts"), build: { watch: {} } });
