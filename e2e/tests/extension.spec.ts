import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { launchWithExtension } from "./extension-browser";
import { collectErrors } from "./helpers";

const PAGE = "http://localhost:5174/content.html";
const STRICT_CSP_PAGE = "http://localhost:5174/strict-csp.html";

test.skip(({ browserName }) => browserName === "webkit", "Safari extensions are built differently and are not part of this repository.");

const highlights = (page: Page) => page.evaluate(() => CSS.highlights.get("clamly-anchor")?.size ?? 0);

test("the extension does nothing while off and anchors pages when switched on", async () => {
  const testInfo = test.info();
  const extension = await launchWithExtension(testInfo);
  try {
    const popup = await extension.openPopup();
    const page = await extension.context.newPage();
    const registered = () => popup.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).length);

    // Browsers silently drop a suggested shortcut that clashes with one of their own.
    const shortcut = await popup.evaluate(
      async () => (await chrome.commands.getAll()).find((command) => command.name === "toggle-anchor")?.shortcut ?? ""
    );
    if (testInfo.project.name === "edge") {
      // Edge keeps Ctrl+Shift+Y for Collections, so readers pick a key at edge://extensions/shortcuts.
      testInfo.annotations.push({ type: "shortcut", description: shortcut || "not assigned" });
    } else {
      expect(shortcut).not.toBe("");
    }

    // Off by default: no content script is registered, so the page is untouched.
    await page.goto(PAGE);
    const original = await page.locator("article").innerHTML();
    expect(await highlights(page)).toBe(0);
    expect(
      await page.evaluate(
        () =>
          document.adoptedStyleSheets.length === 0 &&
          document.querySelector("[data-clamly-anchor], [data-clamly-anchor-styles], [id^='clamly-anchor']") === null
      )
    ).toBe(true);

    // Switched on: pages loaded from now on are anchored, without changing their DOM.
    await popup.evaluate(() => chrome.storage.sync.set({ enabled: true }));
    await expect.poll(registered).toBe(1);
    await page.reload();
    await expect.poll(() => highlights(page)).toBeGreaterThan(10);
    expect(await page.locator("article").innerHTML()).toBe(original);

    // Excluding the site removes the anchors from the open page.
    await popup.evaluate(() => chrome.storage.sync.set({ customSites: ["localhost"] }));
    await expect.poll(() => highlights(page)).toBe(0);

    // Switched off: anchors disappear and the script is unregistered.
    await popup.evaluate(() => chrome.storage.sync.set({ customSites: [], enabled: false }));
    await expect.poll(registered).toBe(0);
    await page.reload();
    expect(await highlights(page)).toBe(0);
  } finally {
    await extension.close();
  }
});

test("reading aids work under a strict Content-Security-Policy and leave code, controls, icons and Arabic alone", async ({
  browserName
}, testInfo) => {
  const extension = await launchWithExtension(testInfo);
  try {
    const page = await extension.context.newPage();
    const errors = collectErrors(page);
    await page.goto(STRICT_CSP_PAGE);
    const styles = () =>
      page.evaluate(() =>
        Object.fromEntries(
          ["prose", "code", "token", "icon", "button", "arabic"].map((id) => {
            const style = getComputedStyle(document.getElementById(id) as Element);
            return [id, { font: style.fontFamily, letterSpacing: style.letterSpacing }];
          })
        )
      );
    const before = await styles();

    // Switch everything on in the popup, as a reader would.
    const popup = await extension.openPopup();
    await popup.getByRole("switch", { name: "Reading anchors" }).click();
    await popup.getByRole("switch", { name: "Readable font" }).click();
    await popup.getByRole("switch", { name: "Extra text spacing" }).click();
    await expect(popup.getByRole("switch", { name: "Readable font" })).toHaveAttribute("aria-checked", "true");
    await expect.poll(() => popup.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).length)).toBe(1);

    await page.reload();
    await expect.poll(() => highlights(page)).toBeGreaterThan(0);
    await expect.poll(async () => (await styles())["prose"]?.font).toMatch(/^"?Clamly Anchor Readable/);
    const after = await styles();
    // 0.12em of the 16px text: the WCAG 1.4.12 letter spacing.
    expect(after["prose"]?.letterSpacing).toBe("1.92px");
    for (const id of ["code", "token", "icon", "button", "arabic"]) expect(after[id], id).toEqual(before[id]);

    // The font file really loaded from the extension, despite the page's font-src.
    await expect
      .poll(() =>
        page.evaluate(async () => {
          await document.fonts.ready;
          return Array.from(document.fonts, (face) => `${face.family.replaceAll('"', "")} ${face.status}`);
        })
      )
      .toContain("Clamly Anchor Readable loaded");
    if (browserName === "chromium") expect(await renderedFonts(page, "#prose")).toContain("Atkinson Hyperlegible Next");
    expect(errors.filter((error) => /content.security.policy|font-src|style-src/i.test(error))).toEqual([]);

    // Switching the font off brings back the page's own.
    await popup.getByRole("switch", { name: "Readable font" }).click();
    await expect.poll(async () => (await styles())["prose"]?.font).toBe(before["prose"]?.font);
    expect((await styles())["prose"]?.letterSpacing).toBe("1.92px");
  } finally {
    await extension.close();
  }
});

test("the popup passes axe's WCAG 2.2 AA checks, switched off and on", async () => {
  const extension = await launchWithExtension(test.info());
  try {
    const popup = await extension.openPopup();
    const problems = async () => {
      const { violations } = await new AxeBuilder({ page: popup })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      return violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
    };
    expect(await problems()).toEqual([]);
    await popup.getByRole("switch", { name: "Reading anchors" }).click();
    await expect(popup.getByRole("switch", { name: "Readable font" })).toBeEnabled();
    expect(await problems()).toEqual([]);
  } finally {
    await extension.close();
  }
});

/** The fonts Chromium actually used to draw an element's text. */
async function renderedFonts(page: Page, selector: string): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    return fonts.map((font) => font.familyName);
  } finally {
    await cdp.detach();
  }
}
