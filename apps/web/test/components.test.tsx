// @vitest-environment jsdom
import { calculateReadingMetrics } from "@clamly/anchor";
import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CodeBlock } from "../components/code-block";
import { SelfTest } from "../components/self-test";
import { STORAGE_KEY } from "../lib/self-test";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

async function render(element: ReactElement): Promise<HTMLElement> {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(element));
  return container;
}

function button(container: HTMLElement, name: string): HTMLButtonElement {
  const found = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.getAttribute("aria-label") === name || candidate.textContent?.trim() === name
  );
  if (!found) throw new Error(`No button named "${name}"`);
  return found;
}

const click = (element: HTMLElement | undefined): Promise<void> => act(async () => element?.click());

function useClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("<CodeBlock>", () => {
  it("is never anchored, and copies exactly the code it shows", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(async () => undefined);
    useClipboard(writeText);
    const container = await render(<CodeBlock code={"\n  npm install @clamly/anchor\n"} title="Terminal" />);
    expect(container.querySelector("figure")?.getAttribute("data-anchor")).toBe("off");
    expect(container.querySelector("code")?.textContent).toBe("npm install @clamly/anchor");

    await click(button(container, "Copy Terminal"));
    expect(writeText).toHaveBeenCalledWith("npm install @clamly/anchor");
    expect(button(container, "Copy Terminal").textContent).toBe("Copied");
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Copied");

    await act(async () => vi.advanceTimersByTime(2000));
    expect(button(container, "Copy Terminal").textContent).toBe("Copy");
  });

  it("tells the reader when copying fails", async () => {
    useClipboard(async () => Promise.reject(new Error("Permission denied")));
    const container = await render(<CodeBlock code="createAnchor(main)" />);
    await click(button(container, "Copy code"));
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Copy failed");
  });
});

describe("<SelfTest>", () => {
  it("measures both passages, shows the results and keeps them only in this browser", async () => {
    // Show the second passage first, without anchors.
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    let now = 0;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const container = await render(<SelfTest />);
    const heading = (): HTMLElement | null => container.querySelector("h2");

    async function readPassage(seconds: number, option: number): Promise<{ words: number; anchors: number }> {
      await click(button(container, "Show the passage"));
      const passage = container.querySelector(".self-test-passage");
      expect(passage?.getAttribute("data-anchor")).toBe("off");
      const result = {
        words: calculateReadingMetrics(passage?.textContent ?? "").wordCount,
        anchors: passage?.querySelectorAll("b").length ?? 0
      };
      now += seconds * 1000;
      await click(button(container, "I have finished reading"));
      await click(container.querySelectorAll<HTMLInputElement>('input[type="radio"]')[option]);
      return result;
    }

    await click(button(container, "Start"));
    expect(heading()?.textContent).toBe("Passage 1 of 2");
    expect(container.textContent).toContain("shown without anchors");
    // Focus follows each step, for keyboard and screen-reader users.
    expect(document.activeElement).toBe(heading());

    const plain = await readPassage(60, 0);
    expect(plain.anchors).toBe(0);
    await click(button(container, "Next passage"));
    expect(heading()?.textContent).toBe("Passage 2 of 2");
    const anchored = await readPassage(30, 1);
    expect(anchored.anchors).toBeGreaterThan(10);
    await click(button(container, "See results"));

    expect(heading()?.textContent).toBe("Your results");
    const rows = Array.from(container.querySelectorAll("tbody tr"), (row) => Array.from(row.children, (cell) => cell.textContent));
    expect(rows).toEqual([
      ["Without anchors", String(plain.words), "Correct"],
      ["With anchors", String(anchored.words * 2), "Incorrect"]
    ]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")).toHaveLength(1);
    expect(container.textContent).toContain("Your averages over 1 run");

    await click(button(container, "Clear my results"));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(container.textContent).not.toContain("Your averages");
  });
});
