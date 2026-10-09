import { expect, test } from "@playwright/test";

interface Measurement {
  firstAnchorsMs: number;
  longestTaskMs: number;
  lazyCount: number;
  flushAllMs: number;
  totalCount: number;
}

// Long-task timing is only exposed by Chromium; the budgets are generous so
// they catch real regressions rather than noise on slow CI machines.
for (const renderer of ["highlight", "dom"] as const) {
  test(`a 60,000-word page stays responsive with the ${renderer} renderer`, async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== "chromium", "Long-task timing is only available in Chromium.");
    await page.goto("/large.html");
    await page.waitForFunction(() => window.ready === true);

    const result: Measurement = await page.evaluate(async (name) => {
      const count = (): number =>
        name === "highlight"
          ? (CSS.highlights.get("clamly-anchor")?.size ?? 0)
          : document.querySelectorAll('b[data-clamly-anchor="fixation"]').length;
      const longTasks: number[] = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longTasks.push(entry.duration);
      });
      observer.observe({ type: "longtask" });

      const start = performance.now();
      const controller = window.anchorApi?.createAnchor(document, { renderer: name });
      await new Promise<void>((resolve) => {
        const check = (): void => (count() > 0 ? resolve() : void requestAnimationFrame(check));
        check();
      });
      const firstAnchorsMs = performance.now() - start;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      observer.disconnect();
      const lazyCount = count();

      const flushStart = performance.now();
      controller?.flush();
      const flushAllMs = performance.now() - flushStart;
      return { firstAnchorsMs, longestTaskMs: Math.max(0, ...longTasks), lazyCount, flushAllMs, totalCount: count() };
    }, renderer);

    testInfo.annotations.push({ type: "performance", description: JSON.stringify(result) });
    expect(result.firstAnchorsMs).toBeLessThan(500);
    // Only content near the viewport is anchored at first, without blocking the page.
    expect(result.lazyCount).toBeLessThan(result.totalCount / 10);
    expect(result.longestTaskMs).toBeLessThan(150);
    // Anchoring all 60,000 words at once (as before printing) still finishes promptly.
    expect(result.totalCount).toBeGreaterThan(50_000);
    expect(result.flushAllMs).toBeLessThan(renderer === "highlight" ? 2000 : 4000);
  });
}
