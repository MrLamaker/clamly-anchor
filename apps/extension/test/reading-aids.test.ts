// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createPageStyle } from "../src/shared/page-style";
import {
  createReadableFont,
  READABLE_FONT_FAMILY,
  READABLE_FONT_FILES,
  READABLE_FONT_SELECTOR,
  readableFontCss
} from "../src/shared/readable-font";
import { TEXT_SPACING_CSS, TEXT_SPACING_SELECTOR } from "../src/shared/spacing";

// A path, not a URL: jsdom replaces the global URL class, which node:fs does not accept.
const FONT_PACKAGE = resolve(import.meta.dirname, "../node_modules/@fontsource-variable/atkinson-hyperlegible-next");

const PAGE = `
  <p data-t="p">Text with a <a data-t="a" href="#">link</a> and <em data-t="em">emphasis</em></p>
  <ul><li data-t="li">Item</li></ul>
  <pre data-t="pre"><code data-t="code"><span data-t="token">const</span> x = 1;</code></pre>
  <p>Inline <code data-t="inline-code">x</code> and <kbd data-t="kbd">Ctrl</kbd></p>
  <button data-t="button"><span data-t="button-label">Save</span></button>
  <label data-t="label">Name <input data-t="input" /></label>
  <span data-t="material" class="material-icons">home</span>
  <span data-t="symbols" class="material-symbols-outlined">search</span>
  <i data-t="font-awesome" class="fa-solid fa-house"></i>
  <span data-t="decorative" aria-hidden="true">*</span>
  <svg><text data-t="svg-text">Chart label</text></svg>
  <div class="cm-editor"><div data-t="editor-line">let x</div></div>
  <p data-t="arabic" lang="ar">مرحبا بالعالم</p>
  <p data-t="serbian-latin" lang="sr-Latn">Zdravo svete</p>
  <p data-t="serbian" lang="sr">Здраво свете</p>
  <div lang="ja"><p data-t="japanese">日本語の文章</p></div>`;

function matching(selector: string): string[] {
  document.body.innerHTML = PAGE;
  return Array.from(document.querySelectorAll<HTMLElement>("[data-t]"))
    .filter((element) => element.matches(selector))
    .map((element) => element.dataset["t"] ?? "");
}

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
});

describe("reading aids", () => {
  it("space out text, but not code, controls, graphics, editors or icons", () => {
    expect(matching(TEXT_SPACING_SELECTOR)).toEqual(["p", "a", "em", "li", "label", "arabic", "serbian-latin", "serbian", "japanese"]);
  });

  it("use the readable font only for prose in languages written in Latin script", () => {
    expect(matching(READABLE_FONT_SELECTOR)).toEqual(["p", "a", "em", "li", "label", "serbian-latin"]);
  });

  it("use the WCAG 1.4.12 text-spacing values", () => {
    expect(TEXT_SPACING_CSS).toContain("line-height: 1.5 !important");
    expect(TEXT_SPACING_CSS).toContain("letter-spacing: 0.12em !important");
    expect(TEXT_SPACING_CSS).toContain("word-spacing: 0.16em !important");
    expect(TEXT_SPACING_CSS).toContain("margin-block-end: 2em !important");
  });

  it("give inherited spacing back to code, controls and icons, and keep cursive scripts joined", () => {
    // No specificity and no !important: spacing the page sets for them itself still wins.
    expect(TEXT_SPACING_CSS).toMatch(/:where\(code, code \*, pre, [^{]*\) \{\s*letter-spacing: normal;\s*word-spacing: normal;\s*\}/);
    expect(TEXT_SPACING_CSS).toMatch(/:lang\(ar\)[^{]*\{\s*letter-spacing: normal !important;\s*\}/);
  });
});

describe("readable font", () => {
  it("declares every bundled file at the URL the extension serves it from", () => {
    const css = readableFontCss((path) => `chrome-extension://abc/${path}`);
    expect(css.match(/@font-face/g)).toHaveLength(READABLE_FONT_FILES.length);
    for (const file of READABLE_FONT_FILES) {
      expect(css).toContain(`src: url("chrome-extension://abc/${file.path}") format("woff2")`);
    }
    expect(css).toContain(`font-family: "${READABLE_FONT_FAMILY}"`);
    expect(css).toContain("font-weight: 200 800");
    expect(css).toContain(`font-family: "${READABLE_FONT_FAMILY}", "Atkinson Hyperlegible Next"`);
  });

  it("matches the files and character ranges of the font package", () => {
    const ranges = JSON.parse(readFileSync(resolve(FONT_PACKAGE, "unicode.json"), "utf8")) as Record<string, string>;
    for (const file of READABLE_FONT_FILES) {
      const name = file.path.slice("fonts/".length);
      expect(existsSync(resolve(FONT_PACKAGE, "files", name)), name).toBe(true);
      const subset = name.includes("-latin-ext-") ? "latin-ext" : "latin";
      expect(file.unicodeRange.replaceAll(" ", "")).toBe(ranges[subset]);
    }
  });

  it("gives text in other scripts, and SVG charts, the page's own font instead of inheriting the readable one", () => {
    const css = readableFontCss((path) => path, 'Georgia, "DejaVu Serif", serif');
    expect(css).toMatch(
      /:where\(svg:not\(\[font-family\]\), :is\(:lang\(ar\), [^{]*\) \{\s*font-family: Georgia, "DejaVu Serif", serif;\s*\}/
    );
    expect(readableFontCss((path) => path)).not.toContain("svg:not");
  });

  it("is added and removed as one stylesheet, keeping the page's font for other scripts", () => {
    document.body.style.fontFamily = "Georgia, serif";
    const font = createReadableFont(document, (path) => `moz-extension://uuid/${path}`);
    font.show();
    font.show();
    const styles = document.querySelectorAll("#clamly-anchor-readable-font");
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain("moz-extension://uuid/fonts/");
    expect(styles[0]?.textContent).toMatch(/\{\s*font-family: Georgia, serif;\s*\}/);
    font.hide();
    expect(document.getElementById("clamly-anchor-readable-font")).toBeNull();
  });
});

describe("page stylesheets", () => {
  it("fall back to one <style> element when constructed stylesheets are unavailable", () => {
    const style = createPageStyle(document, "test-style", () => "p { color: red; }");
    style.show();
    style.show();
    expect(document.querySelectorAll("#test-style")).toHaveLength(1);
    style.hide();
    style.hide();
    expect(document.getElementById("test-style")).toBeNull();
  });

  it("prefer a constructed stylesheet, and leave the page's own adopted sheets alone", () => {
    class FakeSheet {
      text = "";
      replaceSync(css: string): void {
        this.text = css;
      }
    }
    const pageSheet = new FakeSheet();
    const original = window.CSSStyleSheet;
    Object.defineProperty(document, "adoptedStyleSheets", { value: [pageSheet], writable: true, configurable: true });
    window.CSSStyleSheet = FakeSheet as unknown as typeof CSSStyleSheet;
    try {
      const style = createPageStyle(document, "test-style", () => "p { color: red; }");
      style.show();
      expect(document.adoptedStyleSheets).toHaveLength(2);
      expect((document.adoptedStyleSheets[1] as unknown as FakeSheet).text).toBe("p { color: red; }");
      expect(document.getElementById("test-style")).toBeNull();
      style.hide();
      expect(document.adoptedStyleSheets).toEqual([pageSheet]);
    } finally {
      window.CSSStyleSheet = original;
      Reflect.deleteProperty(document, "adoptedStyleSheets");
    }
  });
});
