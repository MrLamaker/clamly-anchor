import { OPT_OUT_ATTRIBUTE } from "./constants";
import type { AnchorController } from "./types";

export interface AnchorToggleOptions {
  /** A live controller from `createAnchor` to switch on and off. */
  controller?: AnchorController;
  /**
   * For anchors rendered ahead of time (`processText`, framework components,
   * the rehype plugin): this element gets `data-anchor="on"` or `"off"`, which
   * the Anchor stylesheet uses to show or hide them. Defaults to `<html>` when
   * no controller is given.
   */
  markupRoot?: Element | null;
  /** Where to insert the button. By default it floats at the bottom right of the page. */
  container?: Element;
  /** State used until the reader makes a choice. Defaults to false: readers opt in. */
  defaultEnabled?: boolean;
  /** localStorage key that remembers the reader's choice, or null to not remember it. */
  storageKey?: string | null;
  /** Visible button label. Defaults to "Reading anchors". */
  label?: string;
  /** Skip the built-in button styles. */
  unstyled?: boolean;
  /** Called after the state changes. */
  onChange?: (enabled: boolean) => void;
}

export interface AnchorToggle {
  readonly element: HTMLButtonElement;
  readonly enabled: boolean;
  set(enabled: boolean): void;
  /** Removes the button and its listeners. The controller is left as it is. */
  destroy(): void;
}

const DEFAULT_STORAGE_KEY = "clamly-anchor";
const STYLE_ATTRIBUTE = "data-clamly-anchor-toggle-styles";

/** Default button styles. Override them with the custom properties below or pass `unstyled: true`. */
export const TOGGLE_CSS: string = `.clamly-anchor-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  min-height: 44px;
  padding: 0.5em 0.9em;
  border: 1px solid var(--clamly-anchor-toggle-border, #4a5cc0);
  border-radius: 999px;
  background: var(--clamly-anchor-toggle-background, #ffffff);
  color: var(--clamly-anchor-toggle-color, #1f2440);
  font: 600 14px/1.2 system-ui, sans-serif;
  cursor: pointer;
}
.clamly-anchor-toggle[aria-pressed="true"] {
  background: var(--clamly-anchor-toggle-active-background, #4a5cc0);
  color: var(--clamly-anchor-toggle-active-color, #ffffff);
}
.clamly-anchor-toggle:focus-visible {
  outline: 3px solid var(--clamly-anchor-toggle-focus, #8da2fb);
  outline-offset: 2px;
}
.clamly-anchor-toggle[data-floating] {
  position: fixed;
  right: max(16px, env(safe-area-inset-right));
  bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 2147483000;
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.18);
}
.clamly-anchor-toggle svg {
  width: 1.25em;
  height: 1.25em;
}
@media (prefers-color-scheme: dark) {
  .clamly-anchor-toggle {
    background: var(--clamly-anchor-toggle-background, #1b1e2e);
    color: var(--clamly-anchor-toggle-color, #e8eaff);
    border-color: var(--clamly-anchor-toggle-border, #8da2fb);
  }
}
@media (forced-colors: active) {
  .clamly-anchor-toggle {
    border-color: ButtonText;
  }
  .clamly-anchor-toggle[aria-pressed="true"] {
    background: Highlight;
    color: HighlightText;
  }
}
`;

// "Aa" with a bold first letter: the anchoring idea, drawn with text so it inherits the button colour.
const ICON =
  '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><text x="2" y="17" font-size="15" font-weight="800" fill="currentColor" font-family="system-ui, sans-serif">A</text><text x="13" y="17" font-size="13" font-weight="400" fill="currentColor" font-family="system-ui, sans-serif">a</text></svg>';

const styledDocuments = new WeakMap<Document, number>();

/**
 * Adds an accessible on/off button for reading anchors. It remembers the
 * reader's choice and keeps open tabs of the same site in sync.
 */
export function createAnchorToggle(options: AnchorToggleOptions = {}): AnchorToggle {
  const doc = options.container?.ownerDocument ?? globalThis.document;
  if (!doc) throw new Error("createAnchorToggle needs a document.");
  const view = doc.defaultView;
  const storageKey = options.storageKey === undefined ? DEFAULT_STORAGE_KEY : options.storageKey;
  const markupRoot = options.markupRoot === undefined ? (options.controller ? null : doc.documentElement) : options.markupRoot;

  const button = doc.createElement("button");
  button.type = "button";
  button.className = "clamly-anchor-toggle";
  button.innerHTML = ICON;
  const label = doc.createElement("span");
  label.textContent = options.label ?? "Reading anchors";
  button.append(label);
  if (!options.container) button.setAttribute("data-floating", "");
  if (!options.unstyled) addToggleStyles(doc);

  let enabled = readStored(view, storageKey) ?? options.defaultEnabled ?? false;

  const apply = (next: boolean, persist: boolean): void => {
    enabled = next;
    button.setAttribute("aria-pressed", String(enabled));
    options.controller?.toggle(enabled);
    markupRoot?.setAttribute(OPT_OUT_ATTRIBUTE, enabled ? "on" : "off");
    if (persist) writeStored(view, storageKey, enabled);
    options.onChange?.(enabled);
  };

  const onClick = (): void => apply(!enabled, true);
  // Another tab of the same site changed the choice.
  const onStorage = (event: StorageEvent): void => {
    if (storageKey !== null && event.key === storageKey && (event.newValue === "on" || event.newValue === "off")) {
      apply(event.newValue === "on", false);
    }
  };

  button.addEventListener("click", onClick);
  view?.addEventListener("storage", onStorage);
  (options.container ?? doc.body ?? doc.documentElement).append(button);
  apply(enabled, false);

  return {
    element: button,
    get enabled(): boolean {
      return enabled;
    },
    set(next: boolean): void {
      apply(next, true);
    },
    destroy(): void {
      button.removeEventListener("click", onClick);
      view?.removeEventListener("storage", onStorage);
      button.remove();
    }
  };
}

function readStored(view: Window | null, key: string | null): boolean | undefined {
  if (!view || key === null) return undefined;
  try {
    const value = view.localStorage.getItem(key);
    return value === "on" ? true : value === "off" ? false : undefined;
  } catch {
    return undefined; // Storage can be unavailable, for example in private browsing.
  }
}

function writeStored(view: Window | null, key: string | null, enabled: boolean): void {
  if (!view || key === null) return;
  try {
    view.localStorage.setItem(key, enabled ? "on" : "off");
  } catch {
    // The choice simply is not remembered.
  }
}

function addToggleStyles(doc: Document): void {
  const count = styledDocuments.get(doc) ?? 0;
  styledDocuments.set(doc, count + 1);
  if (count > 0 || doc.querySelector(`style[${STYLE_ATTRIBUTE}]`)) return;
  const style = doc.createElement("style");
  style.setAttribute(STYLE_ATTRIBUTE, "");
  style.textContent = TOGGLE_CSS;
  (doc.head ?? doc.documentElement).append(style);
}
