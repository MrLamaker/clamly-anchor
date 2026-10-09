import { createPageStyle, type PageStyle } from "./page-style";
import { NOT_PROSE_SELECTOR } from "./prose";

/** The elements that get extra spacing: all text except code, controls, graphics, maths and icons. */
export const TEXT_SPACING_SELECTOR = `:where(body) :where(*):not(:is(${NOT_PROSE_SELECTOR}))`;

/**
 * Letter spacing pulls apart letters that cursive scripts join, so text in
 * languages written in Arabic, Syriac or N'Ko script keeps its letter spacing.
 */
const CURSIVE_SCRIPTS_SELECTOR = `:where(body) :is(${["ar", "fa", "ur", "ps", "sd", "ug", "ckb", "syr", "nqo"]
  .map((language) => `:lang(${language})`)
  .join(", ")})`;

/**
 * The WCAG 1.4.12 text-spacing values: line height 1.5 times the font size,
 * paragraph spacing 2 times, letter spacing 0.12 times and word spacing 0.16
 * times. Increased spacing is one of the few typographic changes with research
 * support for some readers with dyslexia. Code, form controls, graphics, maths
 * and icons are left alone. Spacing is inherited, so they get normal spacing
 * back, unless the page sets its own: the rule for that has no specificity.
 */
export const TEXT_SPACING_CSS = `
${TEXT_SPACING_SELECTOR} {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
:where(body) p {
  margin-block-end: 2em !important;
}
${CURSIVE_SCRIPTS_SELECTOR} {
  letter-spacing: normal !important;
}
:where(${NOT_PROSE_SELECTOR}) {
  letter-spacing: normal;
  word-spacing: normal;
}
`;

/** Adds and removes the text-spacing stylesheet. The page's own styles are untouched. */
export function createTextSpacing(doc: Document): PageStyle {
  return createPageStyle(doc, "clamly-anchor-text-spacing", () => TEXT_SPACING_CSS);
}
