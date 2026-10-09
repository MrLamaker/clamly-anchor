import { existsSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { splitText } from "@clamly/anchor";
import { expect, type Page, test } from "@playwright/test";
import { DOC_PAGES } from "../../apps/web/lib/docs-pages";
import { anchors, collectErrors } from "./helpers";

// The production build of the documentation site, served by `next start` (see playwright.config.ts).
const DOCS = "http://localhost:3100";
const BUILT = existsSync(new URL("../../apps/web/.next/BUILD_ID", import.meta.url));
const PAGES = ["/", "/self-test", ...DOC_PAGES.map((page) => page.href)];

test.skip(!BUILT && !process.env["CI"], "Build the documentation site first: pnpm build");
test.use({ baseURL: DOCS });

/** Anchors drawn inside content that must never be anchored: code samples and opted-out regions. */
function anchorsInProtectedContent(page: Page): Promise<number> {
  return page.evaluate(() => {
    const isProtected = (node: Node | null): boolean =>
      Boolean((node instanceof Element ? node : node?.parentElement)?.closest('pre, code, [data-anchor="off"]'));
    const highlight = typeof CSS !== "undefined" && "highlights" in CSS ? CSS.highlights.get("clamly-anchor") : undefined;
    const ranges = highlight ? Array.from(highlight as Iterable<AbstractRange>).filter((range) => isProtected(range.startContainer)) : [];
    const marks = Array.from(document.querySelectorAll('b[data-clamly-anchor="fixation"]')).filter((mark) => isProtected(mark.parentNode));
    return ranges.length + marks.length;
  });
}

test("every page loads without errors, failed requests or a missing title", async ({ page }) => {
  const errors = collectErrors(page);
  const failed: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  for (const path of PAGES) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    expect(await page.title(), path).toMatch(/\S/);
    await expect(page.locator("h1"), path).toHaveCount(1);
    // Let the page's link prefetches finish, so their responses are checked too. WebKit also
    // reports requests that the next navigation cuts off as errors ("access control checks").
    await page.waitForLoadState("networkidle");
  }
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("internal links all lead somewhere, and unknown pages return 404", async ({ page, request }) => {
  const links = new Set<string>();
  for (const path of PAGES) {
    await page.goto(path);
    const hrefs = await page.locator("a[href]").evaluateAll((elements) => elements.map((element) => (element as HTMLAnchorElement).href));
    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin === DOCS) links.add(url.pathname);
    }
  }
  expect(links.size).toBeGreaterThan(PAGES.length - 1);
  for (const link of links) expect((await request.get(link)).status(), link).toBe(200);
  expect((await page.goto("/docs/no-such-page"))?.status()).toBe(404);
});

test("every page passes axe's WCAG 2.2 AA checks", async ({ page }) => {
  const problems: string[] = [];
  for (const path of PAGES) {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    for (const violation of violations) {
      problems.push(`${path} ${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
    }
  }
  expect(problems).toEqual([]);
});

test("the reading toggle anchors prose but never code, and remembers the reader's choice", async ({ page }) => {
  await page.goto("/docs");
  const toggle = page.getByRole("button", { name: "Reading anchors" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await anchors(page, "main")).toEqual([]);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await anchors(page, "main")).length).toBeGreaterThan(20);
  expect(await anchorsInProtectedContent(page)).toBe(0);

  await page.reload();
  await expect(page.getByRole("button", { name: "Reading anchors" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await anchors(page, "main")).length).toBeGreaterThan(20);

  await page.getByRole("button", { name: "Reading anchors" }).click();
  await expect.poll(async () => (await anchors(page, "main")).length).toBe(0);
});

test("the playground anchors what you type and its preview never changes line breaks", async ({ page }) => {
  await page.goto("/#playground");
  const playground = page.locator("#playground");
  const bold = () => playground.locator(".comparison-after b").allTextContents();

  // The playground must pass its settings to Anchor: compare with the library's own output.
  const expected = (fixationStrength: number) =>
    splitText("Reading dense material", { fixationStrength })
      .filter((segment) => segment.bold)
      .map((segment) => segment.value);

  await playground.getByLabel("Your text").fill("Reading dense material");
  await expect.poll(bold).toEqual(expected(45));
  await expect(playground.locator(".metrics dd").first()).toHaveText("3");

  await playground.getByLabel("Fixation strength").fill("80");
  await expect.poll(bold).toEqual(expected(80));
  expect(expected(80)).not.toEqual(expected(45));

  await playground
    .getByLabel("Your text")
    .fill(
      "A longer passage of text that wraps over several lines in the preview, so that any change in the width of bold letters would move words from one line to the next and show up here."
    );
  const heights = await playground.evaluate((section) =>
    Array.from(section.querySelectorAll(".comparison-text"), (element) => element.getBoundingClientRect().height)
  );
  expect(heights).toHaveLength(2);
  expect(heights[0]).toBe(heights[1]);
});

test("the self-test runs from start to results and never sends anything anywhere", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/self-test");

  await page.getByRole("button", { name: "Start" }).click();
  for (const next of ["Next passage", "See results"]) {
    await page.getByRole("button", { name: "Show the passage" }).click();
    await page.getByRole("button", { name: "I have finished reading" }).click();
    await page.getByRole("radio").first().check();
    await page.getByRole("button", { name: next }).click();
  }

  await expect(page.getByRole("heading", { name: "Your results" })).toBeFocused();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("clamly-anchor-self-test") ?? "[]").length)).toBe(1);
  expect(requests.filter((url) => !url.startsWith(DOCS) && !url.startsWith("data:"))).toEqual([]);
});
