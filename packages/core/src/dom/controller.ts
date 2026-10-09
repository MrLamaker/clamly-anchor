import { DEFAULT_SKIPPED_SCRIPTS, NO_SPACE_SCRIPTS } from "../scripts";
import type { AnchorController, AnchorRenderer, CreateAnchorOptions } from "../types";
import { AnchorEngine } from "./engine";
import { isGeneratedNode, isInsideSkipped, PassCache, resolveDomFilter, unitOf } from "./filter";
import { assertValidCreateAnchorOptions } from "./options";
import { HighlightRenderer, MirrorRenderer, NullRenderer, originalOfMirror, type Renderer, supportsHighlights } from "./renderers";
import { acquireStyles, releaseStyles } from "./styles";

const DOCUMENT_NODE = 9;
const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const FRAME_BUDGET_MS = 8;
const UNITS_PER_BATCH = 32;
const PRUNE_INTERVAL_MS = 1000;
// A unit redrawn this often is fighting another script that rewrites the same
// text; Anchor backs off from it rather than loop.
const MAX_REDRAWS = 40;
const REDRAW_WINDOW_MS = 2000;

const WATCHED_ATTRIBUTES = ["data-anchor", "translate", "contenteditable", "hidden", "lang", "role", "aria-live"];
const RESTART_KEYS: ReadonlyArray<keyof CreateAnchorOptions> = ["renderer", "observe", "lazy", "styles"];

/**
 * Anchors the text inside `target` and keeps the anchors in sync as the page
 * changes. Content is processed near the viewport first and in small chunks,
 * so long pages stay responsive. Call `destroy()` to restore the page.
 */
export function createAnchor(target: Element | Document, options: CreateAnchorOptions = {}): AnchorController {
  return new Controller(target, options);
}

/** Whether the current browser supports the CSS Custom Highlight API renderer. */
export function isHighlightSupported(doc: Document | undefined = globalThis.document): boolean {
  return doc !== undefined && supportsHighlights(doc);
}

class Controller implements AnchorController {
  private settings: CreateAnchorOptions;
  private readonly doc: Document;
  private readonly root: Element;
  private engine: AnchorEngine | null = null;
  private activeRenderer: Renderer | null = null;
  private mutationObserver: MutationObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private readonly rendered = new Set<Element>();
  private readonly pending = new Set<Element>();
  private readonly queue = new Set<Element>();
  private readonly redraws = new WeakMap<Element, { count: number; since: number }>();
  private readonly quarantined = new WeakSet<Element>();
  private taskScheduled = false;
  private generation = 0;
  private lastPrune = 0;
  private isEnabled = false;
  private destroyed = false;
  private stylesAcquired = false;
  private readonly onBeforePrint = (): void => this.flush();
  private readonly onAbort = (): void => this.destroy();

  constructor(target: Element | Document, options: CreateAnchorOptions) {
    if (typeof target !== "object" || target === null || (target.nodeType !== DOCUMENT_NODE && target.nodeType !== ELEMENT_NODE)) {
      throw new TypeError("createAnchor expects an Element or a Document.");
    }
    this.doc = target.nodeType === DOCUMENT_NODE ? (target as Document) : (target as Element).ownerDocument;
    this.root = target.nodeType === DOCUMENT_NODE ? (this.doc.body ?? this.doc.documentElement) : (target as Element);
    assertValidCreateAnchorOptions(options, this.doc);
    this.settings = { ...options };

    const { signal } = options;
    if (signal?.aborted) {
      this.destroyed = true;
      return;
    }
    signal?.addEventListener("abort", this.onAbort, { once: true });
    if (options.enabled !== false) this.enable();
  }

  get enabled(): boolean {
    return this.isEnabled;
  }

  get renderer(): "highlight" | "dom" | "none" {
    return this.activeRenderer?.name ?? chooseRenderer(this.settings.renderer ?? "auto", this.doc);
  }

  enable(): void {
    this.assertUsable();
    if (this.isEnabled) return;
    this.isEnabled = true;

    const name = chooseRenderer(this.settings.renderer ?? "auto", this.doc);
    const renderer: Renderer =
      name === "highlight" ? new HighlightRenderer(this.doc) : name === "dom" ? new MirrorRenderer() : new NullRenderer();
    this.activeRenderer = renderer;
    this.engine = this.createEngine(renderer);
    if (this.settings.styles !== false) {
      acquireStyles(this.doc);
      this.stylesAcquired = true;
    }

    const view = this.doc.defaultView;
    if (view && this.settings.lazy !== false && typeof view.IntersectionObserver === "function") {
      // Start a viewport early so text is anchored before it scrolls into view.
      this.intersectionObserver = new view.IntersectionObserver((entries) => this.onIntersect(entries), { rootMargin: "100% 0px" });
    }
    if (view && this.settings.observe !== false && typeof view.MutationObserver === "function") {
      this.mutationObserver = new view.MutationObserver((records) => this.onMutations(records));
      this.mutationObserver.observe(this.root, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: WATCHED_ATTRIBUTES
      });
    }
    view?.addEventListener("beforeprint", this.onBeforePrint);
    this.scan();
  }

  disable(): void {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    this.generation++;
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
    this.doc.defaultView?.removeEventListener("beforeprint", this.onBeforePrint);
    this.queue.clear();
    this.pending.clear();
    this.rendered.clear();
    this.taskScheduled = false;
    this.activeRenderer?.dispose();
    this.activeRenderer = null;
    this.engine = null;
    if (this.stylesAcquired) {
      releaseStyles(this.doc);
      this.stylesAcquired = false;
    }
  }

  toggle(force?: boolean): boolean {
    if (force ?? !this.isEnabled) this.enable();
    else this.disable();
    return this.isEnabled;
  }

  update(options: Partial<CreateAnchorOptions>): void {
    this.assertUsable();
    const next: CreateAnchorOptions = { ...this.settings, ...options };
    assertValidCreateAnchorOptions(next, this.doc);
    const restart = RESTART_KEYS.some((key) => key in options && options[key] !== this.settings[key]);
    this.settings = next;

    if ("enabled" in options && options.enabled === false) {
      this.disable();
      return;
    }
    if (!this.isEnabled) {
      if (options.enabled === true) this.enable();
      return;
    }
    if (restart) {
      this.disable();
      this.enable();
      return;
    }
    // Same renderer, new rules: redraw what is on the page now and look for newly eligible text.
    if (this.activeRenderer) this.engine = this.createEngine(this.activeRenderer);
    for (const unit of this.rendered) this.queue.add(unit);
    this.rendered.clear();
    this.scan();
  }

  refresh(): void {
    if (!this.isEnabled) return;
    this.prune(true);
    for (const unit of this.rendered) this.queue.add(unit);
    this.rendered.clear();
    this.scan();
  }

  flush(): void {
    if (!this.isEnabled || !this.engine) return;
    this.withOwnWrites(() => {
      for (const unit of this.pending) {
        this.intersectionObserver?.unobserve(unit);
        this.queue.add(unit);
      }
      this.pending.clear();
      const units = Array.from(this.queue);
      this.queue.clear();
      this.engine?.renderUnits(units, new PassCache());
      for (const unit of units) this.rendered.add(unit);
    });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.disable();
    this.destroyed = true;
    this.settings.signal?.removeEventListener("abort", this.onAbort);
  }

  private assertUsable(): void {
    if (this.destroyed) throw new Error("This Anchor controller has been destroyed; create a new one.");
  }

  private createEngine(renderer: Renderer): AnchorEngine {
    return new AnchorEngine({
      root: this.root,
      renderer,
      filter: resolveDomFilter(this.settings),
      anchorOptions: this.settings,
      skipScripts: renderer.name === "highlight" ? NO_SPACE_SCRIPTS : DEFAULT_SKIPPED_SCRIPTS
    });
  }

  private scan(): void {
    if (!this.engine) return;
    const units = new Set<Element>();
    this.engine.collectUnits(this.root, units, new PassCache());
    this.schedule(units);
  }

  private schedule(units: Iterable<Element>): void {
    for (const unit of units) {
      if (this.quarantined.has(unit) || this.rendered.has(unit) || this.pending.has(unit)) continue;
      if (this.intersectionObserver) {
        this.pending.add(unit);
        this.intersectionObserver.observe(unit);
      } else {
        this.queue.add(unit);
      }
    }
    this.requestRun();
  }

  private onIntersect(entries: IntersectionObserverEntry[]): void {
    if (!this.isEnabled) return;
    for (const entry of entries) {
      const box = entry.boundingClientRect;
      // Elements without a box (display: contents, or hidden) never intersect; anchor them anyway.
      if (!entry.isIntersecting && (box.width > 0 || box.height > 0)) continue;
      this.intersectionObserver?.unobserve(entry.target);
      if (this.pending.delete(entry.target)) this.queue.add(entry.target);
    }
    this.requestRun();
  }

  private requestRun(): void {
    if (this.taskScheduled || this.queue.size === 0) return;
    this.taskScheduled = true;
    const generation = this.generation;
    scheduleTask(this.doc, () => {
      if (generation !== this.generation) return;
      this.taskScheduled = false;
      this.runQueue();
    });
  }

  private runQueue(): void {
    if (!this.isEnabled || !this.engine) return;
    this.withOwnWrites(() => {
      const start = now();
      const cache = new PassCache();
      const batch: Element[] = [];
      const drain = (): void => {
        this.engine?.renderUnits(batch, cache);
        for (const unit of batch) this.rendered.add(unit);
        batch.length = 0;
      };
      for (const unit of this.queue) {
        this.queue.delete(unit);
        if (!unit.isConnected) continue;
        batch.push(unit);
        if (batch.length >= UNITS_PER_BATCH) {
          drain();
          if (now() - start > FRAME_BUDGET_MS) break;
        }
      }
      if (batch.length > 0) drain();
    });
    this.requestRun();
  }

  /**
   * Runs work that writes to the DOM. Page changes that are still queued are
   * handled first; afterwards the records produced by Anchor's own writes are
   * discarded, so every record the observer delivers later comes from the page.
   */
  private withOwnWrites(work: () => void): void {
    const pending = this.mutationObserver?.takeRecords();
    if (pending && pending.length > 0) this.handleRecords(pending);
    work();
    this.mutationObserver?.takeRecords();
  }

  private onMutations(records: MutationRecord[]): void {
    this.handleRecords(records);
    // No page code ran during this callback: the queue holds only Anchor's own writes.
    this.mutationObserver?.takeRecords();
  }

  private handleRecords(records: MutationRecord[]): void {
    const engine = this.engine;
    const renderer = this.activeRenderer;
    if (!this.isEnabled || !engine || !renderer) return;

    const cache = new PassCache();
    const units = new Set<Element>();
    const touched = new Set<Text>();
    let removedSomething = false;

    for (const record of records) {
      const target = record.target;
      if (record.type === "characterData") {
        const node = target as Text;
        if (renderer.owns(node)) {
          renderer.acceptExternalChange(node);
          touched.add(node);
        } else {
          engine.collectUnits(node, units, cache);
        }
      } else if (record.type === "childList") {
        if (isGeneratedNode(target)) continue;
        for (const node of record.removedNodes) {
          removedSomething = true;
          this.handleRemoved(node, touched);
        }
        for (const node of record.addedNodes) engine.collectUnits(node, units, cache);
        // The page may have inserted something between a text node and its mirror, or moved one of them.
        if (renderer.name === "dom") {
          for (const child of target.childNodes)
            if (child.nodeType === TEXT_NODE && renderer.owns(child as Text)) touched.add(child as Text);
        }
      } else if (record.type === "attributes" && target.nodeType === ELEMENT_NODE) {
        // An element may have become skipped or eligible, or changed language.
        if (isInsideSkipped(target as Element, engine.config.filter, cache)) engine.clearInside(target);
        else engine.collectUnits(target, units, cache);
      }
    }

    if (removedSomething) this.prune(false);
    for (const node of touched) {
      const unit = node.isConnected ? unitOf(node, this.root) : null;
      if (unit) units.add(unit);
      else renderer.clear(node);
    }

    // Units already on screen are corrected before the next paint; new content is scheduled.
    const immediate: Element[] = [];
    const later: Element[] = [];
    for (const unit of units) {
      if (this.quarantined.has(unit)) continue;
      if (this.rendered.has(unit)) {
        if (this.isRedrawingTooOften(unit)) {
          this.quarantined.add(unit);
          this.rendered.delete(unit);
          engine.clearInside(unit);
          continue;
        }
        immediate.push(unit);
      } else {
        later.push(unit);
      }
    }
    if (immediate.length > 0) engine.renderUnits(immediate, cache);
    if (later.length > 0) this.schedule(later);
  }

  private handleRemoved(node: Node, touched: Set<Text>): void {
    const renderer = this.activeRenderer;
    if (!renderer || !this.engine) return;
    // Still on the page: it was moved, and the matching addition redraws it.
    if (node.isConnected) return;
    if (node.nodeType === TEXT_NODE) {
      if (renderer.owns(node as Text)) renderer.clear(node as Text);
      return;
    }
    if (node.nodeType !== ELEMENT_NODE) return;
    // The page removed a mirror without its text node: draw it again.
    const original = originalOfMirror(node as Element);
    if (original) {
      if (renderer.owns(original)) touched.add(original);
      return;
    }
    this.engine.clearInside(node);
  }

  private isRedrawingTooOften(unit: Element): boolean {
    const time = now();
    const entry = this.redraws.get(unit);
    if (!entry || time - entry.since > REDRAW_WINDOW_MS) {
      this.redraws.set(unit, { count: 1, since: time });
      return false;
    }
    return ++entry.count > MAX_REDRAWS;
  }

  private prune(force: boolean): void {
    const time = now();
    if (!force && time - this.lastPrune < PRUNE_INTERVAL_MS) return;
    this.lastPrune = time;
    for (const unit of this.rendered) if (!unit.isConnected) this.rendered.delete(unit);
    for (const unit of this.pending) {
      if (unit.isConnected) continue;
      this.pending.delete(unit);
      this.intersectionObserver?.unobserve(unit);
    }
  }
}

function chooseRenderer(preference: AnchorRenderer, doc: Document): "highlight" | "dom" | "none" {
  if (preference === "dom") return "dom";
  if (supportsHighlights(doc)) return "highlight";
  // An explicit 'highlight' preference means "never change the DOM": draw nothing rather than fall back.
  return preference === "highlight" ? "none" : "dom";
}

function now(): number {
  return typeof performance === "object" ? performance.now() : Date.now();
}

/** Runs a task soon without the 4 ms clamping that nested timers get. */
function scheduleTask(doc: Document, task: () => void): void {
  const view = doc.defaultView;
  const Channel = view?.MessageChannel ?? globalThis.MessageChannel;
  if (typeof Channel === "function") {
    const channel = new Channel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      task();
    };
    channel.port2.postMessage(null);
    return;
  }
  setTimeout(task, 0);
}
