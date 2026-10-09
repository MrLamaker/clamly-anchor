import { expect, test } from "@playwright/test";
import { anchors, collectErrors } from "./helpers";

const FRAMEWORKS = ["react", "vue", "svelte"] as const;
const RENDERERS = ["highlight", "dom"] as const;

// Real React 19, Vue 3 and Svelte 5 apps that update, reorder and remove
// anchored text. Anchor must never break them and must follow every change.
for (const framework of FRAMEWORKS) {
  for (const renderer of RENDERERS) {
    test(`${framework} keeps working with the ${renderer} renderer`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(`/${framework}.html?renderer=${renderer}`);
      await page.waitForFunction(() => window.fixtureReady === true);

      await expect.poll(() => anchors(page, "#app-root")).toEqual(expect.arrayContaining(["Sta", "loa", "res", "Sin", "te", "ch", "Cha"]));

      await page.click("#update");
      await expect(page.locator("#status")).toHaveText("Status: done reading now");
      await expect(page.locator("#single")).toHaveText("Updated single child");
      await expect.poll(() => anchors(page, "#app-root")).toEqual(expect.arrayContaining(["do", "rea", "Upd", "sin"]));
      await expect.poll(() => anchors(page, "#app-root")).not.toContain("loa");

      await page.click("#reorder");
      await expect(page.locator("#list li")).toHaveText(["Charlie item", "Bravo item", "Alpha item"]);

      await page.click("#remove");
      await expect(page.locator("#optional")).toHaveCount(0);

      await page.click("#toggle");
      await expect.poll(() => anchors(page, "#app-root")).toEqual([]);
      await expect(page.locator("#status")).toHaveText("Status: done reading now");
      await expect(page.locator("#list li")).toHaveText(["Charlie item", "Bravo item", "Alpha item"]);

      await page.click("#toggle");
      await expect.poll(async () => (await anchors(page, "#app-root")).length).toBeGreaterThan(0);

      expect(errors).toEqual([]);
    });
  }
}
