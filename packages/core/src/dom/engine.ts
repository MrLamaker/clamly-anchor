import { BLOCK_TAGS, GENERATED_ATTRIBUTE } from "../constants";
import { type ResolvedAnchorOptions, resolveOptions } from "../options";
import { type PlanState, planAnchors } from "../text";
import type { AnchorOptions, AnchorSpan, ProcessedTextNode } from "../types";
import {
  isBoldElement,
  isGeneratedNode,
  isInsideSkipped,
  isSkippedElement,
  langOf,
  type PassCache,
  type ResolvedDomFilter,
  unitOf
} from "./filter";
import { mirrorOf, type Renderer } from "./renderers";

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const SHOW_ELEMENT = 0x1;
const SHOW_TEXT = 0x4;
const FILTER_ACCEPT = 1;
const FILTER_REJECT = 2;
const FILTER_SKIP = 3;
const FIXATION_SELECTOR = `[${GENERATED_ATTRIBUTE}="fixation"]`;
const MIRROR_SELECTOR = `[${GENERATED_ATTRIBUTE}="text"]`;
// Fixation prefixes that are not inside one of Anchor's own mirror elements.
const PRERENDERED_SELECTOR = `${FIXATION_SELECTOR}:not(${MIRROR_SELECTOR} > *)`;

export interface EngineConfig {
  readonly root: Element;
  readonly renderer: Renderer;
  readonly filter: ResolvedDomFilter;
  readonly anchorOptions: AnchorOptions;
  /** The renderer's default script policy, used unless `anchorOptions.skipScripts` is set. */
  readonly skipScripts: readonly string[];
  readonly onNodeProcessed?: ((node: ProcessedTextNode) => void) | undefined;
}

interface PlannedNode {
  node: Text;
  text: string;
  spans: AnchorSpan[] | null;
}

/** Finds eligible text below a root and draws anchors one paragraph-like unit at a time. */
export class AnchorEngine {
  private readonly resolved = new Map<string, ResolvedAnchorOptions>();

  constructor(readonly config: EngineConfig) {}

  /** Whether a node lies inside this engine's root. */
  contains(node: Node): boolean {
    return node === this.config.root || this.config.root.contains(node);
  }

  /** Adds the units that contain candidate text inside `container`. */
  collectUnits(container: Node, units: Set<Element>, cache: PassCache): void {
    const { root, filter, renderer } = this.config;
    if (!this.contains(container) || isGeneratedNode(container)) return;

    if (container.nodeType === TEXT_NODE) {
      const node = container as Text;
      if (!renderer.owns(node) && node.data.trim() === "") return;
      if (node.parentElement && isInsideSkipped(node.parentElement, filter, cache)) return;
      const unit = unitOf(node, root);
      if (unit) units.add(unit);
      return;
    }
    if (container.nodeType !== ELEMENT_NODE) return;
    const element = container as Element;
    if (isInsideSkipped(element, filter, cache)) return;

    const walker = element.ownerDocument.createTreeWalker(element, SHOW_ELEMENT | SHOW_TEXT, {
      acceptNode: (node) => {
        if (node.nodeType === ELEMENT_NODE) return isSkippedElement(node as Element, filter) ? FILTER_REJECT : FILTER_SKIP;
        return renderer.owns(node as Text) || (node as Text).data.trim() !== "" ? FILTER_ACCEPT : FILTER_REJECT;
      }
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const unit = unitOf(node, root);
      if (unit) units.add(unit);
    }
  }

  /** Removes anchors from every owned text node inside `container`. */
  clearInside(container: Node): void {
    const { renderer } = this.config;
    if (renderer.size === 0) return;
    if (container.nodeType === TEXT_NODE) {
      renderer.clear(container as Text);
      return;
    }
    const doc = container.ownerDocument ?? (container as Document);
    const walker = doc.createTreeWalker(container, SHOW_TEXT);
    const owned: Text[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) if (renderer.owns(node as Text)) owned.push(node as Text);
    for (const node of owned) renderer.clear(node);
  }

  /** Plans every unit first and writes afterwards, so style reads never interleave with DOM writes. */
  renderUnits(units: Iterable<Element>, cache: PassCache): void {
    const plans: PlannedNode[] = [];
    for (const unit of units) this.planUnit(unit, cache, plans);
    for (const plan of plans) this.apply(plan);
  }

  private optionsFor(locale: string | undefined): ResolvedAnchorOptions {
    const key = this.config.anchorOptions.locale === undefined ? (locale ?? "") : "";
    let resolved = this.resolved.get(key);
    if (!resolved) {
      resolved = resolveOptions(this.config.anchorOptions, { skipScripts: this.config.skipScripts, locale: key || undefined });
      this.resolved.set(key, resolved);
    }
    return resolved;
  }

  /**
   * Whether a unit already holds anchors that Anchor did not draw itself, for
   * example server-rendered `processText` output. The text after each such
   * `<b>` is the rest of a word, so the unit must not be anchored again.
   */
  private hasPrerenderedAnchors(unit: Element): boolean {
    let candidates: Iterable<Element>;
    try {
      candidates = unit.querySelectorAll(PRERENDERED_SELECTOR);
    } catch {
      candidates = Array.from(unit.querySelectorAll(FIXATION_SELECTOR)).filter((element) => !element.closest(MIRROR_SELECTOR));
    }
    for (const element of candidates) if (unitOf(element, this.config.root) === unit) return true;
    return false;
  }

  private planUnit(unit: Element, cache: PassCache, plans: PlannedNode[]): void {
    const { renderer, filter } = this.config;
    if (!unit.isConnected || !this.contains(unit)) return;
    if (isInsideSkipped(unit, filter, cache) || this.hasPrerenderedAnchors(unit)) {
      this.clearInside(unit);
      return;
    }

    const newlySkipped: Element[] = [];
    const walker = unit.ownerDocument.createTreeWalker(unit, SHOW_ELEMENT | SHOW_TEXT, {
      acceptNode: (node) => {
        if (node.nodeType === ELEMENT_NODE) {
          const element = node as Element;
          if (BLOCK_TAGS.has(element.localName)) return FILTER_REJECT; // A unit of its own.
          if (isSkippedElement(element, filter)) {
            if (!element.hasAttribute(GENERATED_ATTRIBUTE)) newlySkipped.push(element);
            return FILTER_REJECT;
          }
          return FILTER_SKIP;
        }
        return renderer.owns(node as Text) || (node as Text).data.trim() !== "" ? FILTER_ACCEPT : FILTER_REJECT;
      }
    });

    // One counter per unit keeps the 'alternating' rhythm across links and emphasis.
    const state: PlanState = { wordIndex: 0 };
    for (let current = walker.nextNode(); current; current = walker.nextNode()) {
      const node = current as Text;
      const parent = node.parentElement;
      const text = renderer.source(node);
      if (!parent || text.trim() === "" || (filter.skipBoldText && isBoldElement(parent, cache))) {
        plans.push({ node, text, spans: null });
        continue;
      }
      plans.push({ node, text, spans: planAnchors(text, this.optionsFor(langOf(parent, cache)), state) });
    }
    // Content that became skipped (for example data-anchor="off" was added) loses its anchors.
    for (const element of newlySkipped) this.clearInside(element);
  }

  private apply({ node, text, spans }: PlannedNode): void {
    const { renderer, onNodeProcessed } = this.config;
    if (!node.isConnected || spans === null || spans.length === 0) {
      renderer.clear(node);
      return;
    }
    const count = renderer.render(node, text, spans);
    if (count > 0 && onNodeProcessed) {
      const wrapper = mirrorOf(node);
      if (wrapper) onNodeProcessed({ originalText: text, node, wrapper, fixationCount: count });
    }
  }
}
