import { BLOCK_TAGS, GENERATED_ATTRIBUTE, OPT_OUT_ATTRIBUTE, SKIPPED_ROLES, SKIPPED_TAGS } from "../constants";
import { canonicalLocale } from "../options";
import type { DomFilterOptions } from "../types";

const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const ELEMENT_NODE = 1;
const DEFAULT_TAG_NAMES: readonly string[] = Array.from(SKIPPED_TAGS, (tag) => tag.toLowerCase());
const GENERATED_SELECTOR = `[${GENERATED_ATTRIBUTE}]`;

/** DOM filtering options after normalisation. */
export interface ResolvedDomFilter {
  readonly skipTags: ReadonlySet<string>;
  readonly skipRoles: ReadonlySet<string>;
  readonly skipSelector: string | undefined;
  readonly skipBoldText: boolean;
}

export function resolveDomFilter(options: DomFilterOptions): ResolvedDomFilter {
  return {
    skipTags: new Set([...DEFAULT_TAG_NAMES, ...(options.skipTags ?? []).map((tag) => tag.trim().toLowerCase())]),
    skipRoles: new Set([...SKIPPED_ROLES, ...(options.skipRoles ?? []).map((role) => role.trim().toLowerCase())]),
    skipSelector: options.skipSelector?.trim() || undefined,
    skipBoldText: options.skipBoldText ?? true
  };
}

/** Memoised element checks for one batch of work. Page state may change between batches. */
export class PassCache {
  readonly skipped: Map<Element, boolean> = new Map();
  readonly bold: Map<Element, boolean> = new Map();
  readonly lang: Map<Element, string | undefined> = new Map();
}

/** Whether Anchor must leave this element's content alone. Ancestors are checked separately. */
export function isSkippedElement(element: Element, filter: ResolvedDomFilter): boolean {
  // SVG and MathML: generated HTML inside them is not rendered, so labels would vanish.
  if (element.namespaceURI !== XHTML_NAMESPACE) return true;
  if (filter.skipTags.has(element.localName)) return true;
  if (element.hasAttribute(GENERATED_ATTRIBUTE)) return true;

  const optOut = element.getAttribute(OPT_OUT_ATTRIBUTE);
  if (optOut === "off" || optOut === "false") return true;
  if (element.getAttribute("translate")?.toLowerCase() === "no") return true;

  const hidden = element.getAttribute("hidden");
  if (hidden !== null && hidden !== "until-found") return true;

  // Changing text inside a live region makes screen readers announce it again.
  const live = element.getAttribute("aria-live");
  if (live === "polite" || live === "assertive") return true;

  const editable = element.getAttribute("contenteditable");
  if ((editable !== null && editable.toLowerCase() !== "false") || (element as HTMLElement).isContentEditable === true) return true;

  const role = element.getAttribute("role");
  if (
    role
      ?.toLowerCase()
      .split(/\s+/)
      .some((token) => filter.skipRoles.has(token))
  )
    return true;

  return filter.skipSelector !== undefined && element.matches(filter.skipSelector);
}

/** Whether the element or any ancestor is skipped. Results are memoised per pass. */
export function isInsideSkipped(element: Element | null, filter: ResolvedDomFilter, cache: PassCache): boolean {
  const path: Element[] = [];
  let skipped = false;
  for (let current = element; current; current = current.parentElement) {
    const known = cache.skipped.get(current);
    if (known !== undefined) {
      skipped = known;
      break;
    }
    path.push(current);
    if (isSkippedElement(current, filter)) {
      skipped = true;
      break;
    }
  }
  for (const visited of path) cache.skipped.set(visited, skipped);
  return skipped;
}

/** Whether a node is markup that Clamly Anchor generated, or lies inside it. */
export function isGeneratedNode(node: Node): boolean {
  const element = node.nodeType === ELEMENT_NODE ? (node as Element) : node.parentElement;
  return element?.closest(GENERATED_SELECTOR) != null;
}

/**
 * The paragraph-like element a text node belongs to: its nearest block
 * ancestor inside `root`, or `root` itself. Null when the node is outside root.
 */
export function unitOf(node: Node, root: Element): Element | null {
  for (let element = node.parentElement; element; element = element.parentElement) {
    if (element === root) return root;
    if (BLOCK_TAGS.has(element.localName)) return root.contains(element) ? element : null;
  }
  return null;
}

/** The canonical language of an element from the nearest `lang` attribute, if any. */
export function langOf(element: Element, cache: PassCache): string | undefined {
  const path: Element[] = [];
  let lang: string | undefined;
  for (let current: Element | null = element; current; current = current.parentElement) {
    if (cache.lang.has(current)) {
      lang = cache.lang.get(current);
      break;
    }
    path.push(current);
    const own = current.getAttribute("lang");
    if (own !== null) {
      lang = canonicalLocale(own);
      break;
    }
  }
  for (const visited of path) cache.lang.set(visited, lang);
  return lang;
}

/** Whether an element's text is already bold (font-weight of 600 or more). */
export function isBoldElement(element: Element, cache: PassCache): boolean {
  const known = cache.bold.get(element);
  if (known !== undefined) return known;
  let bold = false;
  const view = element.ownerDocument.defaultView;
  if (view) {
    const weight = view.getComputedStyle(element).fontWeight;
    const numeric = Number.parseFloat(weight);
    bold = Number.isNaN(numeric) ? weight === "bold" || weight === "bolder" : numeric >= 600;
  }
  cache.bold.set(element, bold);
  return bold;
}
