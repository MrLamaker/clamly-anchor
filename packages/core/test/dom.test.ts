// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { processElement, restoreElement } from "../src/dom";

describe("processElement", () => {
  it("processes visible text and skips protected tags", () => {
    const root = document.createElement("main");
    root.innerHTML = "<p>Dense reading.</p><code>const untouched = true;</code><button>Leave this alone</button>";

    processElement(root);

    expect(root.querySelectorAll('[data-clamly-anchor="fixation"]').length).toBeGreaterThan(0);
    expect(root.querySelector("code")?.textContent).toBe("const untouched = true;");
    expect(root.querySelector("button")?.innerHTML).toBe("Leave this alone");
  });

  it("is idempotent and can restore the original text", () => {
    const root = document.createElement("div");
    root.textContent = "Original content remains readable.";

    processElement(root);
    const generatedCount = root.querySelectorAll('[data-clamly-anchor="fixation"]').length;
    processElement(root);
    expect(root.querySelectorAll('[data-clamly-anchor="fixation"]')).toHaveLength(generatedCount);

    restoreElement(root);
    expect(root.textContent).toBe("Original content remains readable.");
    expect(root.querySelector("[data-clamly-anchor]")).toBeNull();
  });

  it("keeps an anchored text node as one inline unit in flex layouts", () => {
    const root = document.createElement("div");
    root.innerHTML = '<a style="display: flex">Get Started</a>';

    processElement(root);

    const wrapper = root.querySelector<HTMLElement>('[data-clamly-anchor="text"]');
    expect(wrapper?.style.display).toBe("inline");
    expect(wrapper?.textContent).toBe("Get Started");
    expect(wrapper?.querySelectorAll("b").length).toBeGreaterThan(0);
  });

  it("honors custom skipped tags and roles", () => {
    const root = document.createElement("div");
    root.innerHTML = '<aside>Leave this alone</aside><p role="note">Process this text</p>';

    processElement(root, { skipTags: ["aside"], skipRoles: ["note"] });

    expect(root.querySelector("aside")?.querySelector("b")).toBeNull();
    expect(root.querySelector('[role="note"]')?.querySelector("b")).toBeNull();
  });

  it("notifies callers after each transformed text node", () => {
    const root = document.createElement("div");
    root.innerHTML = "<p>First sentence.</p><p>Second sentence.</p>";
    const processed: Array<{ originalText: string; fixationCount: number }> = [];

    processElement(root, {
      onNodeProcessed: ({ originalText, fixationCount, wrapper }) => {
        processed.push({ originalText, fixationCount });
        expect(wrapper.parentElement?.tagName).toBe("P");
      }
    });

    expect(processed).toEqual([
      { originalText: "First sentence.", fixationCount: 2 },
      { originalText: "Second sentence.", fixationCount: 2 }
    ]);
  });
});
