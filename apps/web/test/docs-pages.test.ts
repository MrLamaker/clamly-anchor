import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DOC_PAGES } from "../lib/docs-pages";

const APP = resolve(import.meta.dirname, "../app");

describe("documentation navigation", () => {
  it("links only to pages that exist", () => {
    for (const page of DOC_PAGES) expect(existsSync(resolve(APP, `.${page.href}`, "page.tsx")), page.href).toBe(true);
  });

  it("lists every documentation page once", () => {
    const pages = readdirSync(resolve(APP, "docs"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(resolve(APP, "docs", entry.name, "page.tsx")))
      .map((entry) => `/docs/${entry.name}`);
    const listed = DOC_PAGES.map((page) => page.href);
    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual(["/docs", ...pages].sort());
  });
});
