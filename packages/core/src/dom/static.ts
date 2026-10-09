import { GENERATED_ATTRIBUTE } from "../constants";
import { DEFAULT_SKIPPED_SCRIPTS } from "../scripts";
import type { ProcessElementOptions } from "../types";
import { AnchorEngine } from "./engine";
import { PassCache, resolveDomFilter } from "./filter";
import { assertValidProcessElementOptions, describeInvalidDomOptions } from "./options";
import { MirrorRenderer, restoreMirror } from "./renderers";
import { acquireStyles } from "./styles";

const ELEMENT_NODE = 1;

// One renderer for every processElement call, so later calls can redraw text
// that earlier calls anchored, for example with a different strength.
const staticRenderer = new MirrorRenderer();
const styledDocuments = new WeakSet<Document>();

/**
 * Anchors the text below an element once, using generated `<b>` elements.
 * The page's own text nodes stay in place, so `restoreElement` restores them
 * exactly. Calling it again redraws with the new options. For pages that
 * change after loading, use `createAnchor`, which keeps anchors in sync.
 */
export function processElement(element: Element, options: ProcessElementOptions = {}): void {
  if (typeof element !== "object" || element === null || element.nodeType !== ELEMENT_NODE) {
    throw new TypeError("processElement expects an Element.");
  }
  const problems = describeInvalidDomOptions(options, element.ownerDocument, "processElement");
  if (problems.length > 0) throw new TypeError(`Invalid processElement options: ${problems.join("; ")}.`);

  const doc = element.ownerDocument;
  if (!styledDocuments.has(doc)) {
    styledDocuments.add(doc);
    acquireStyles(doc);
  }
  const engine = new AnchorEngine({
    root: element,
    renderer: staticRenderer,
    filter: resolveDomFilter(options),
    anchorOptions: options,
    skipScripts: DEFAULT_SKIPPED_SCRIPTS,
    onNodeProcessed: options.onNodeProcessed
  });
  const cache = new PassCache();
  const units = new Set<Element>();
  engine.collectUnits(element, units, cache);
  engine.renderUnits(units, cache);
}

/**
 * Removes the `<b>` anchors that `processElement` or the DOM renderer added
 * below an element and puts the text back into the page's original text
 * nodes. Nothing else is touched: no text nodes are merged or replaced.
 * Anchors drawn by a live `createAnchor` controller return while it is
 * enabled; call its `disable()` or `destroy()` instead.
 */
export function restoreElement(element: Element): void {
  if (typeof element !== "object" || element === null || element.nodeType !== ELEMENT_NODE) {
    throw new TypeError("restoreElement expects an Element.");
  }
  for (const mirror of Array.from(element.querySelectorAll(`[${GENERATED_ATTRIBUTE}="text"]`))) {
    // Markup from 0.2.x replaced the original node, which cannot be recovered; restore its text.
    if (!restoreMirror(mirror)) mirror.replaceWith(mirror.ownerDocument.createTextNode(mirror.textContent ?? ""));
  }
}

export { assertValidProcessElementOptions };
