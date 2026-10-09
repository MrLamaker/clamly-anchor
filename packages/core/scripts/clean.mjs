// Removes the previous build so files from deleted modules can never be published.
import { rm } from "node:fs/promises";

await rm(new URL("../dist", import.meta.url), { recursive: true, force: true });
