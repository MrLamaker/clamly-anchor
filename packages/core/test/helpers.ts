/** Waits for pending mutation-observer callbacks and scheduled tasks to run. */
export function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 5));
}

/** Text of every generated bold prefix below an element, in document order. */
export function anchoredWords(root: ParentNode): string[] {
  return Array.from(root.querySelectorAll('b[data-clamly-anchor="fixation"]'), (bold) => bold.textContent ?? "");
}

export interface FakeHighlightApi {
  registry: Map<string, Set<StaticRange>>;
  /** Text covered by every range in the shared highlight, in insertion order. */
  highlightedText(): string[];
  uninstall(): void;
}

/**
 * Installs a minimal CSS Custom Highlight API on the jsdom window, enough to
 * verify which text ranges the highlight renderer registers. Real rendering is
 * covered by the browser tests.
 */
export function installFakeHighlightApi(): FakeHighlightApi {
  const registry = new Map<string, Set<StaticRange>>();
  const view = window as unknown as Record<string, unknown>;
  const previousCss = view["CSS"];
  const previousHighlight = view["Highlight"];
  class Highlight extends Set<StaticRange> {}
  Object.defineProperty(window, "Highlight", { value: Highlight, configurable: true, writable: true });
  Object.defineProperty(window, "CSS", { value: { ...(previousCss as object), highlights: registry }, configurable: true, writable: true });
  return {
    registry,
    highlightedText(): string[] {
      const highlight = registry.get("clamly-anchor");
      return highlight
        ? Array.from(highlight, (range) => (range.startContainer as Text).data.slice(range.startOffset, range.endOffset))
        : [];
    },
    uninstall(): void {
      Object.defineProperty(window, "Highlight", { value: previousHighlight, configurable: true, writable: true });
      Object.defineProperty(window, "CSS", { value: previousCss, configurable: true, writable: true });
    }
  };
}
