import { expect, type Page, test } from "@playwright/test";
import { anchors } from "./helpers";

const PARAGRAPHS = ["#latin", "#inline", "#devanagari", "#arabic", "#cjk", "#thai"];

function boxes(page: Page): Promise<number[][]> {
  return page.evaluate(
    (selectors) =>
      selectors.map((selector) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return box ? [box.x, box.y, box.width, box.height] : [];
      }),
    PARAGRAPHS
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/content.html");
  await page.waitForFunction(() => window.ready === true);
});

test("the highlight renderer never moves text, in any script", async ({ page }, testInfo) => {
  const before = await boxes(page);
  await page.evaluate(() => window.anchorApi?.createAnchor(document, { renderer: "highlight", lazy: false }).flush());
  expect((await anchors(page, "#latin")).length).toBeGreaterThan(0);
  expect(await boxes(page)).toEqual(before);
  await testInfo.attach("highlight renderer", { body: await page.locator("article").screenshot(), contentType: "image/png" });
});

test("each script is handled as documented by both renderers", async ({ page }, testInfo) => {
  await page.evaluate(() => {
    window.controller = window.anchorApi?.createAnchor(document, { renderer: "highlight", lazy: false });
    window.controller?.flush();
  });
  // Highlights never split glyphs, so cursive Arabic is anchored; no-space scripts are not.
  expect((await anchors(page, "#arabic")).length).toBeGreaterThan(0);
  expect((await anchors(page, "#devanagari"))[0]).toBe("हि");
  expect(await anchors(page, "#cjk")).toEqual([]);
  expect(await anchors(page, "#thai")).toEqual([]);

  await page.evaluate(() => {
    window.controller?.destroy();
    window.controller = window.anchorApi?.createAnchor(document, { renderer: "dom", lazy: false });
    window.controller?.flush();
  });
  // Markup would split Arabic words across a weight change, so the DOM renderer leaves them joined.
  expect(await anchors(page, "#arabic")).toEqual([]);
  expect((await anchors(page, "#devanagari"))[0]).toBe("हि");
  expect(await anchors(page, "#cjk")).toEqual([]);
  expect(await anchors(page, "#thai")).toEqual([]);
  await testInfo.attach("dom renderer", { body: await page.locator("article").screenshot(), contentType: "image/png" });
});

test("content Anchor must skip stays exactly as it was", async ({ page }) => {
  const protectedSelectors = ["nav", "pre", "#name", "form button", "#live", "#editable", "svg", "#optout", "h1"];
  const read = () =>
    page.evaluate((selectors) => selectors.map((selector) => document.querySelector(selector)?.outerHTML), protectedSelectors);
  const before = await read();
  await page.evaluate(() => window.anchorApi?.createAnchor(document, { renderer: "dom", lazy: false }).flush());
  expect((await anchors(page, "#latin")).length).toBeGreaterThan(0);
  expect(await read()).toEqual(before);
  await expect(page.locator("#name")).toHaveValue("Typed value");
});
