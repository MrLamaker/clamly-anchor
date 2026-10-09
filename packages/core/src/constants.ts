import { STOP_WORDS } from "./stopwords";

/** Attribute that marks markup created by Clamly Anchor. */
export const GENERATED_ATTRIBUTE = "data-clamly-anchor";

/** Attribute that site owners set to "off" on an element to keep Anchor out of it. */
export const OPT_OUT_ATTRIBUTE = "data-anchor";

/** Name of the CSS Custom Highlight used by the highlight renderer: style it with `::highlight(clamly-anchor)`. */
export const HIGHLIGHT_NAME = "clamly-anchor";

/** HTML elements whose content is never modified (uppercase, as `Element.tagName` reports them). */
export const SKIPPED_TAGS: ReadonlySet<string> = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "TITLE",
  "HEAD",
  "CODE",
  "PRE",
  "KBD",
  "SAMP",
  "VAR",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "OPTGROUP",
  "DATALIST",
  "BUTTON",
  "NAV",
  "MENU",
  "CANVAS",
  "VIDEO",
  "AUDIO",
  "OBJECT",
  "EMBED",
  "IFRAME",
  "RP",
  "RT"
]);

/** ARIA roles whose content is never modified: widgets, navigation and live regions. */
export const SKIPPED_ROLES: ReadonlySet<string> = new Set([
  "alert",
  "alertdialog",
  "application",
  "button",
  "checkbox",
  "code",
  "combobox",
  "img",
  "listbox",
  "log",
  "marquee",
  "math",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "meter",
  "navigation",
  "option",
  "progressbar",
  "radio",
  "scrollbar",
  "searchbox",
  "slider",
  "spinbutton",
  "status",
  "switch",
  "tab",
  "tablist",
  "textbox",
  "timer",
  "toolbar",
  "tooltip",
  "tree",
  "treeitem"
]);

/**
 * Elements that start a new paragraph-like unit. Words are counted per unit,
 * so the 'alternating' cadence keeps its rhythm across links and emphasis.
 */
export const BLOCK_TAGS: ReadonlySet<string> = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "body",
  "caption",
  "dd",
  "details",
  "dialog",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "html",
  "legend",
  "li",
  "main",
  "ol",
  "p",
  "search",
  "section",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul"
]);

/** English stop words used by the 'saccade' cadence when no locale is given. */
export const SACCADE_STOP_WORDS: ReadonlySet<string> = new Set(STOP_WORDS["en"]);
