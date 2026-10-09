// Writes the default stylesheet next to the build output so projects that
// disable automatic style injection (for example under a strict CSP) can
// import "@clamly/anchor/styles.css" instead.
import { writeFile } from "node:fs/promises";

const { ANCHOR_CSS } = await import(new URL("../dist/index.js", import.meta.url).href);
await writeFile(new URL("../dist/styles.css", import.meta.url), `/* @clamly/anchor default styles */\n${ANCHOR_CSS}`);
