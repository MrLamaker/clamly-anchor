/**
 * The default Anchor stylesheet. Customise it with CSS custom properties:
 * `--clamly-anchor-weight` and `--clamly-anchor-color` for bold prefixes, and
 * `--clamly-anchor-shadow` for the highlight renderer, which cannot change
 * font weight and draws a thin text shadow in the text's own colour instead.
 * Setting `data-anchor="off"` on an ancestor neutralises pre-rendered anchors.
 */
export const ANCHOR_CSS: string = `b[data-clamly-anchor="fixation"],
.clamly-anchor-bold {
  font-weight: var(--clamly-anchor-weight, 700);
  color: var(--clamly-anchor-color, inherit);
}

[data-anchor="off"] b[data-clamly-anchor="fixation"],
[data-anchor="off"] .clamly-anchor-bold {
  font-weight: inherit;
  color: inherit;
}

::highlight(clamly-anchor) {
  text-shadow: var(--clamly-anchor-shadow, 0.05em 0 0 currentColor);
}
`;

const STYLE_ATTRIBUTE = "data-clamly-anchor-styles";

interface StyleState {
  users: number;
  sheet: CSSStyleSheet | undefined;
  element: HTMLStyleElement | undefined;
}

const states = new WeakMap<Document, StyleState>();

/** Adds the Anchor stylesheet to a document. Calls are reference-counted. */
export function acquireStyles(doc: Document): void {
  let state = states.get(doc);
  if (!state) {
    state = { users: 0, sheet: undefined, element: undefined };
    states.set(doc, state);
  }
  if (state.users++ > 0) return;

  const view = doc.defaultView;
  if (view && "adoptedStyleSheets" in doc && typeof view.CSSStyleSheet === "function") {
    try {
      // Constructed sheets need no <style> element and are not subject to
      // CSP rules that block inline style elements.
      const sheet = new view.CSSStyleSheet();
      sheet.replaceSync(ANCHOR_CSS);
      doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
      state.sheet = sheet;
      return;
    } catch {
      // Fall back to a <style> element below.
    }
  }
  const element = doc.createElement("style");
  element.setAttribute(STYLE_ATTRIBUTE, "");
  element.textContent = ANCHOR_CSS;
  (doc.head ?? doc.documentElement).append(element);
  state.element = element;
}

/** Releases one `acquireStyles` call and removes the stylesheet after the last one. */
export function releaseStyles(doc: Document): void {
  const state = states.get(doc);
  if (!state || state.users === 0 || --state.users > 0) return;
  if (state.sheet) {
    const sheet = state.sheet;
    doc.adoptedStyleSheets = doc.adoptedStyleSheets.filter((candidate) => candidate !== sheet);
  }
  state.element?.remove();
  states.delete(doc);
}
