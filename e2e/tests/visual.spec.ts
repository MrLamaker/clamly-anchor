import { expect, test } from "@playwright/test";

const SCRIPTS = ["latin", "devanagari", "arabic", "japanese", "thai"];

// Text rendering differs between operating systems and browser builds, so the
// approved screenshots are only compared in Playwright's Docker image, which
// CI uses (ANCHOR_VISUAL=1 turns them on). CONTRIBUTING.md explains how to
// update them after an intended change.
test.describe("approved screenshots", { tag: "@visual" }, () => {
  test.skip(!process.env["ANCHOR_VISUAL"], "Compared in Playwright's Docker image only, as in CI.");
  // A new screenshot is written by the attempt that fails for lack of it, so a retry would pass silently.
  test.describe.configure({ retries: 0 });

  for (const renderer of ["highlight", "dom"] as const) {
    test(`the ${renderer} renderer draws anchors as approved in every script`, async ({ page }) => {
      await page.goto("/visual.html");
      await page.waitForFunction(() => window.ready === true);
      await page.evaluate((name) => window.anchorApi?.createAnchor(document, { renderer: name, lazy: false }).flush(), renderer);
      for (const script of SCRIPTS) {
        await expect.soft(page.locator(`#${script}`)).toHaveScreenshot(`${script}-${renderer}.png`);
      }
    });
  }
});
