import { createPageStyle, type PageStyle } from "./page-style";
import { NOT_PROSE_SELECTOR } from "./prose";

/** A family name of our own, so the bundled font never mixes with a page's fonts. */
export const READABLE_FONT_FAMILY = "Clamly Anchor Readable";

const LATIN =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT =
  "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

export interface FontFile {
  /** Path inside the extension; the build copies the file there. */
  path: string;
  style: "normal" | "italic";
  unicodeRange: string;
}

/**
 * Atkinson Hyperlegible Next, from the Braille Institute, under the SIL Open
 * Font License. It is designed so that easily confused characters (I, l and
 * 1; O and 0; b, d, p and q) look clearly different. Variable weights 200-800.
 */
export const READABLE_FONT_FILES: readonly FontFile[] = [
  { path: "fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2", style: "normal", unicodeRange: LATIN },
  { path: "fonts/atkinson-hyperlegible-next-latin-ext-wght-normal.woff2", style: "normal", unicodeRange: LATIN_EXT },
  { path: "fonts/atkinson-hyperlegible-next-latin-wght-italic.woff2", style: "italic", unicodeRange: LATIN },
  { path: "fonts/atkinson-hyperlegible-next-latin-ext-wght-italic.woff2", style: "italic", unicodeRange: LATIN_EXT }
];

/**
 * Languages usually written in scripts the font does not cover: Arabic,
 * Hebrew, Cyrillic, Greek, Armenian, Georgian, Ethiopic, Thaana, Tibetan,
 * Indic, Southeast Asian and CJK. Text marked with them keeps the page's font.
 */
const OTHER_SCRIPT_LANGUAGES = [
  ...["ar", "fa", "ur", "ps", "sd", "ug", "ckb", "he", "yi"],
  ...["ru", "uk", "be", "bg", "mk", "kk", "ky", "tg", "mn", "tt", "ba", "el"],
  ...["hy", "ka", "am", "ti", "dv", "bo"],
  ...["hi", "mr", "ne", "sa", "bn", "as", "pa", "gu", "or", "ta", "te", "kn", "ml", "si"],
  ...["th", "lo", "km", "my", "zh", "ja", "ko"]
];

const OTHER_SCRIPTS_SELECTOR = [
  ...OTHER_SCRIPT_LANGUAGES.map((language) => `:lang(${language})`),
  // Serbian is written in both Cyrillic and Latin.
  ":lang(sr):not(:lang(sr-Latn))"
].join(", ");

/** The elements that get the readable font: prose, except in languages the font does not cover. */
export const READABLE_FONT_SELECTOR = `:where(body, body *):not(:is(${NOT_PROSE_SELECTOR})):not(:is(${OTHER_SCRIPTS_SELECTOR}))`;

const FONT_STACK = `"${READABLE_FONT_FAMILY}", "Atkinson Hyperlegible Next", "Atkinson Hyperlegible", Verdana, "DejaVu Sans", sans-serif`;

/** The stylesheet for the readable font. `urlFor` turns a file's path into the URL the page can load it from. */
export function readableFontCss(urlFor: (path: string) => string, pageFont = ""): string {
  const faces = READABLE_FONT_FILES.map(
    (file) => `@font-face {
  font-family: "${READABLE_FONT_FAMILY}";
  font-style: ${file.style};
  font-weight: 200 800;
  font-display: swap;
  src: url("${urlFor(file.path)}") format("woff2");
  unicode-range: ${file.unicodeRange};
}`
  );
  // Fonts are inherited: without this, text in other scripts and SVG charts
  // would inherit the readable font from the prose around them. The rule has
  // no specificity, so any font the page sets for them still wins.
  const keepPageFont = pageFont
    ? `
:where(svg:not([font-family]), :is(${OTHER_SCRIPTS_SELECTOR}):not(:is(${NOT_PROSE_SELECTOR}))) {
  font-family: ${pageFont};
}`
    : "";
  return `${faces.join("\n")}
${READABLE_FONT_SELECTOR} {
  font-family: ${FONT_STACK} !important;
}${keepPageFont}
`;
}

/** Switches the page's prose to the readable font, leaving code, controls, icons and other scripts alone. */
export function createReadableFont(doc: Document, urlFor: (path: string) => string): PageStyle {
  let pageFont = "";
  const style = createPageStyle(doc, "clamly-anchor-readable-font", () => readableFontCss(urlFor, pageFont));
  return {
    show(): void {
      // Read the page's own font before the readable one replaces it.
      if (!pageFont && doc.body && doc.defaultView) pageFont = doc.defaultView.getComputedStyle(doc.body).fontFamily;
      style.show();
    },
    hide: () => style.hide()
  };
}
