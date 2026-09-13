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
});
