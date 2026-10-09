import type { Page } from "@playwright/test";

/**
 * The text of every anchor on the page, whichever renderer drew it: ranges in
 * the shared highlight, then generated <b> elements, each in document order.
 */
export function anchors(page: Page, within = "body"): Promise<string[]> {
  return page.evaluate((selector) => {
    const scope = document.querySelector(selector);
    if (!scope) return [];
    const highlight = typeof CSS !== "undefined" && "highlights" in CSS ? CSS.highlights.get("clamly-anchor") : undefined;
    const fromHighlights = highlight
      ? Array.from(highlight as Iterable<AbstractRange>)
          .filter((range) => scope.contains(range.startContainer))
          .map((range) => (range.startContainer as Text).data.slice(range.startOffset, range.endOffset))
      : [];
    const fromDom = Array.from(scope.querySelectorAll('b[data-clamly-anchor="fixation"]'), (b) => b.textContent ?? "");
    return [...fromHighlights, ...fromDom];
  }, within);
}

/** Collects uncaught errors and console errors, so tests can assert that none happened. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}
