import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { anchors } from "./helpers";

for (const renderer of ["highlight", "dom"] as const) {
  test(`the ${renderer} renderer leaves the accessibility tree and axe results unchanged`, async ({ page }) => {
    await page.goto("/content.html");
    await page.waitForFunction(() => window.ready === true);
    const treeBefore = await page.locator("body").ariaSnapshot();
    const axeBefore = await new AxeBuilder({ page }).analyze();

    await page.evaluate((name) => {
      const controller = window.anchorApi?.createAnchor(document, { renderer: name, lazy: false });
      controller?.flush();
    }, renderer);
    expect((await anchors(page)).length).toBeGreaterThan(20);

    // What assistive technology sees must not change at all.
    expect(await page.locator("body").ariaSnapshot()).toBe(treeBefore);
    const axeAfter = await new AxeBuilder({ page }).analyze();
    expect(axeAfter.violations.map((violation) => violation.id)).toEqual(axeBefore.violations.map((violation) => violation.id));
  });
}

test("the reader toggle is accessible and works from the keyboard", async ({ page }) => {
  await page.goto("/script-tag.html");
  const toggle = page.getByRole("button", { name: "Reading anchors" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  const results = await new AxeBuilder({ page }).include(".clamly-anchor-toggle").analyze();
  expect(results.violations).toEqual([]);

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
});
