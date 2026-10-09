import { GENERATED_ATTRIBUTE, HIGHLIGHT_NAME } from "../constants";
import { segmentsFromSpans } from "../text";
import type { AnchorSpan } from "../types";

/** Draws fixation anchors for individual text nodes. */
export interface Renderer {
  readonly name: "highlight" | "dom" | "none";
  /** Number of text nodes this renderer currently draws anchors for. */
  readonly size: number;
  /** Whether this renderer currently draws anchors for the node. */
  owns(node: Text): boolean;
  /** The node's text as the page wrote it. */
  source(node: Text): string;
  /** Draws anchors for the node and returns how many it drew. */
  render(node: Text, text: string, spans: readonly AnchorSpan[]): number;
  /** Removes the node's anchors and restores it exactly. */
  clear(node: Text): void;
  /** Called when the page itself changed the text of an owned node. */
  acceptExternalChange(node: Text): void;
  /** Removes every anchor and releases shared resources. */
  dispose(): void;
}

function spansKey(spans: readonly AnchorSpan[]): string {
  let key = "";
  for (const span of spans) key += `${span.start}:${span.end},`;
  return key;
}

// ---------------------------------------------------------------------------
// DOM renderer
//
// Frameworks such as React, Vue, Svelte and Lit keep references to the text
// nodes they create and later update or remove them directly. Replacing those
// nodes breaks the page: updates land on detached nodes and removals throw.
// This renderer therefore never moves or replaces the page's node. It copies
// the text into a generated sibling that holds the bold prefixes, then empties
// the original in place. Restoring puts the text back into the same node.
// ---------------------------------------------------------------------------

interface MirrorRecord {
  mirror: HTMLSpanElement;
  source: string;
  key: string;
  owner: MirrorRenderer;
}

const mirrorRecords = new WeakMap<Text, MirrorRecord>();
const mirrorOriginals = new WeakMap<Element, Text>();

export class MirrorRenderer implements Renderer {
  readonly name = "dom" as const;
  private readonly nodes = new Set<Text>();

  get size(): number {
    return this.nodes.size;
  }

  owns(node: Text): boolean {
    return mirrorRecords.get(node)?.owner === this;
  }

  source(node: Text): string {
    const record = mirrorRecords.get(node);
    return record !== undefined && node.data === "" ? record.source : node.data;
  }

  render(node: Text, text: string, spans: readonly AnchorSpan[]): number {
    const existing = mirrorRecords.get(node);
    if (existing && existing.owner !== this) return 0; // Another Anchor instance manages this node.
    if (spans.length === 0) {
      this.clear(node);
      return 0;
    }

    const record = existing ?? this.track(node);
    const key = spansKey(spans);
    if (record.key !== key || record.source !== text) {
      record.mirror.replaceChildren(buildMirrorContent(node.ownerDocument, text, spans));
      record.key = key;
      record.source = text;
    }
    if (node.nextSibling !== record.mirror) node.after(record.mirror);
    if (node.data !== "") node.data = "";
    return spans.length;
  }

  clear(node: Text): void {
    const record = mirrorRecords.get(node);
    if (record?.owner === this) release(node, record, true);
  }

  acceptExternalChange(node: Text): void {
    // The page wrote to a node this renderer had emptied. New text is redrawn by
    // the caller; an empty string means the page wants no text there at all.
    if (node.data !== "") return;
    const record = mirrorRecords.get(node);
    if (record?.owner === this) release(node, record, false);
  }

  dispose(): void {
    for (const node of Array.from(this.nodes)) this.clear(node);
  }

  /** @internal Called when a record owned by this renderer is released. */
  forget(node: Text): void {
    this.nodes.delete(node);
  }

  private track(node: Text): MirrorRecord {
    const mirror = node.ownerDocument.createElement("span");
    mirror.setAttribute(GENERATED_ATTRIBUTE, "text");
    // One inline box per text node. `display: contents` would turn the prefix and
    // suffix into separate flex or grid items, so "Get Started" would read "Get Sta rted".
    mirror.style.display = "inline";
    const record: MirrorRecord = { mirror, source: "", key: "", owner: this };
    mirrorRecords.set(node, record);
    mirrorOriginals.set(mirror, node);
    this.nodes.add(node);
    return record;
  }
}

function buildMirrorContent(doc: Document, text: string, spans: readonly AnchorSpan[]): DocumentFragment {
  const fragment = doc.createDocumentFragment();
  for (const segment of segmentsFromSpans(text, spans)) {
    if (!segment.bold) {
      fragment.append(doc.createTextNode(segment.value));
      continue;
    }
    const bold = doc.createElement("b");
    bold.setAttribute(GENERATED_ATTRIBUTE, "fixation");
    bold.className = "clamly-anchor-bold";
    bold.textContent = segment.value;
    fragment.append(bold);
  }
  return fragment;
}

function release(node: Text, record: MirrorRecord, restoreText: boolean): void {
  if (restoreText && node.data === "") node.data = record.source;
  record.mirror.remove();
  mirrorRecords.delete(node);
  mirrorOriginals.delete(record.mirror);
  record.owner.forget(node);
}

/** The page's own text node behind a generated mirror element. */
export function originalOfMirror(element: Element): Text | undefined {
  return mirrorOriginals.get(element);
}

/** The generated mirror element that displays a text node's anchors. */
export function mirrorOf(node: Text): HTMLSpanElement | undefined {
  return mirrorRecords.get(node)?.mirror;
}

/** Restores the text node behind a mirror, whichever instance created it. */
export function restoreMirror(element: Element): boolean {
  const node = mirrorOriginals.get(element);
  const record = node ? mirrorRecords.get(node) : undefined;
  if (!node || !record) return false;
  release(node, record, true);
  return true;
}

// ---------------------------------------------------------------------------
// Highlight renderer: the CSS Custom Highlight API styles ranges of text
// without touching the DOM, so pages, frameworks and text layout are unaffected.
// ---------------------------------------------------------------------------

interface HighlightEntry {
  ranges: StaticRange[];
  key: string;
  text: string;
}

interface SharedHighlight {
  highlight: Highlight;
  users: number;
}

const sharedHighlights = new WeakMap<Document, SharedHighlight>();

/** Whether a document's browser supports the CSS Custom Highlight API. */
export function supportsHighlights(doc: Document): boolean {
  const view = doc.defaultView;
  return (
    view !== null &&
    typeof view.Highlight === "function" &&
    typeof view.StaticRange === "function" &&
    typeof view.CSS === "object" &&
    view.CSS !== null &&
    "highlights" in view.CSS
  );
}

export class HighlightRenderer implements Renderer {
  readonly name = "highlight" as const;
  private readonly entries = new Map<Text, HighlightEntry>();
  private readonly highlight: Highlight;
  private readonly registry: HighlightRegistry;
  private readonly view: Window & typeof globalThis;
  private disposed = false;

  constructor(private readonly doc: Document) {
    const view = doc.defaultView;
    if (!view || !supportsHighlights(doc)) throw new Error("The CSS Custom Highlight API is not available.");
    this.view = view;
    this.registry = view.CSS.highlights;
    let shared = sharedHighlights.get(doc);
    if (!shared) {
      const highlight = this.registry.get(HIGHLIGHT_NAME) ?? new view.Highlight();
      this.registry.set(HIGHLIGHT_NAME, highlight);
      shared = { highlight, users: 0 };
      sharedHighlights.set(doc, shared);
    }
    shared.users++;
    this.highlight = shared.highlight;
  }

  get size(): number {
    return this.entries.size;
  }

  owns(node: Text): boolean {
    return this.entries.has(node);
  }

  source(node: Text): string {
    return node.data;
  }

  render(node: Text, text: string, spans: readonly AnchorSpan[]): number {
    const key = spansKey(spans);
    const entry = this.entries.get(node);
    if (entry && entry.key === key && entry.text === text) return spans.length;
    this.clear(node);
    if (spans.length === 0) return 0;
    // Static ranges are cheap: unlike live ranges they are not updated on every
    // DOM mutation. The observer redraws a node whenever its text changes.
    const ranges = spans.map(
      (span) => new this.view.StaticRange({ startContainer: node, startOffset: span.start, endContainer: node, endOffset: span.end })
    );
    for (const range of ranges) this.highlight.add(range);
    this.entries.set(node, { ranges, key, text });
    return spans.length;
  }

  clear(node: Text): void {
    const entry = this.entries.get(node);
    if (!entry) return;
    for (const range of entry.ranges) this.highlight.delete(range);
    this.entries.delete(node);
  }

  acceptExternalChange(): void {
    // Ranges are recomputed when the caller redraws the node.
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const node of Array.from(this.entries.keys())) this.clear(node);
    const shared = sharedHighlights.get(this.doc);
    if (shared && --shared.users === 0) {
      sharedHighlights.delete(this.doc);
      // Another copy of the library may share the registry entry; leave it while it has ranges.
      if (shared.highlight.size === 0 && this.registry.get(HIGHLIGHT_NAME) === shared.highlight) {
        this.registry.delete(HIGHLIGHT_NAME);
      }
    }
  }
}

/** Used when the highlight renderer is required but unavailable: draws nothing. */
export class NullRenderer implements Renderer {
  readonly name = "none" as const;
  readonly size = 0;
  owns(): boolean {
    return false;
  }
  source(node: Text): string {
    return node.data;
  }
  render(): number {
    return 0;
  }
  clear(): void {}
  acceptExternalChange(): void {}
  dispose(): void {}
}
