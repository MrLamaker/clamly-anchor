/**
 * Elements whose text is not running prose. Reading aids leave them, and
 * everything inside them, alone: code and code editors rely on fixed
 * character widths, form controls on their own layout, and graphics and
 * maths on exact glyph metrics.
 */
const NOT_PROSE_CONTAINERS = [
  "code",
  "pre",
  "kbd",
  "samp",
  "tt",
  "input",
  "textarea",
  "select",
  "button",
  "svg",
  "math",
  ".monaco-editor",
  ".cm-editor",
  ".CodeMirror",
  ".ace_editor",
  ".xterm"
];

/**
 * Icons drawn with icon fonts. Another font turns them into stray letters, and
 * letter spacing breaks the ligatures that fonts such as Material Icons use.
 * Empty elements cover icons drawn by ::before and ::after.
 */
const ICONS = [
  '[class*="icon" i]',
  '[class*="material-symbols" i]',
  ".fa",
  '[class^="fa-"]',
  '[class*=" fa-"]',
  ".bi",
  '[class^="bi-"]',
  '[class*=" bi-"]',
  '[aria-hidden="true"]',
  ":empty"
];

/** Matches every element that reading aids must not restyle. */
export const NOT_PROSE_SELECTOR: string = [...NOT_PROSE_CONTAINERS.flatMap((selector) => [selector, `${selector} *`]), ...ICONS].join(", ");
