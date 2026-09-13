/** Attribute used to identify markup created by Clamly Anchor. */
export const GENERATED_ATTRIBUTE = "data-clamly-anchor";

/** Tags whose content must never be modified. */
export const SKIPPED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "CODE",
  "PRE",
  "SVG",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "BUTTON",
  "KBD",
  "SAMP",
  "MATH",
  "TEMPLATE",
  "TITLE",
  "NAV",
  "DIALOG",
  "MENU",
  "DETAILS",
  "SUMMARY"
]);

/** Roles whose content should not be visually modified to avoid breaking complex UI components. */
export const SKIPPED_ROLES = new Set([
  "textbox",
  "navigation",
  "menu",
  "menubar",
  "dialog",
  "alertdialog",
  "progressbar"
]);

/** Common short grammatical particles that saccade cadence leaves soft to enhance visual rhythm. */
export const SACCADE_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "so",
  "in", "on", "at", "to", "of", "by", "for", "as",
  "is", "it", "be", "we", "he", "my", "up", "do", "no"
]);
