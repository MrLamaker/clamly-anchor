import { expect, test } from "@playwright/test";
import { anchors, collectErrors } from "./helpers";

test("one script tag adds a reader toggle that remembers the choice", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/script-tag.html");
  const toggle = page.getByRole("button", { name: "Reading anchors" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await anchors(page, "article")).toEqual([]);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => anchors(page, "article")).toContain("Rea");

  await page.reload();
  await expect(page.getByRole("button", { name: "Reading anchors" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => anchors(page, "article")).toContain("Rea");
  expect(errors).toEqual([]);
});

test("the web component anchors its content and follows its attributes", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/element.html");
  await page.waitForFunction(() => window.ready === true);
  await expect.poll(() => anchors(page, "#element")).toEqual(["Ele", "con", "ge", "anc", "t"]);

  await page.locator("#element").evaluate((element) => element.setAttribute("disabled", ""));
  await expect.poll(() => anchors(page, "#element")).toEqual([]);
  await expect(page.locator("#text")).toHaveText("Element content gets anchors too.");
  expect(errors).toEqual([]);
});
