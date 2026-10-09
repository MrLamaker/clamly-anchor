// @vitest-environment jsdom
import { createElement as h, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { type AnchorController, type CreateAnchorOptions, createAnchor, restoreElement } from "../src/index";
import { anchoredWords, installFakeHighlightApi, settle } from "./helpers";

interface Mounted {
  container: HTMLElement;
  render(node: ReactNode): void;
  errors: string[];
  unmount(): void;
}

const cleanups: Array<() => void> = [];

function mount(initial: ReactNode): Mounted {
  const container = document.createElement("div");
  document.body.append(container);
  const errors: string[] = [];
  const record = (error: unknown): void => {
    errors.push(error instanceof Error ? error.message : String(error));
  };
  const root: Root = createRoot(container, { onUncaughtError: record, onCaughtError: record, onRecoverableError: record });
  const render = (node: ReactNode): void => flushSync(() => root.render(node));
  render(initial);
  let unmounted = false;
  const unmount = (): void => {
    if (unmounted) return;
    unmounted = true;
    flushSync(() => root.unmount());
  };
  cleanups.push(unmount);
  return { container, render, errors, unmount };
}

function anchor(target: Element | Document, options: CreateAnchorOptions = {}): AnchorController {
  const controller = createAnchor(target, { renderer: "dom", ...options });
  cleanups.push(() => controller.destroy());
  controller.flush();
  return controller;
}

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  document.body.replaceChildren();
});

describe("React 19 and the DOM renderer", () => {
  it("keeps updating text after a disabled extension-style controller and restoreElement run", async () => {
    const app = mount(h("p", null, "Count: ", 0));
    const controller = createAnchor(document, { enabled: false });
    cleanups.push(() => controller.destroy());
    restoreElement(document.body); // 0.2 merged text nodes here and froze React updates.
    await settle();

    app.render(h("p", null, "Count: ", 1));
    expect(app.container.textContent).toBe("Count: 1");
    expect(app.errors).toEqual([]);
  });

  it("shows React's text updates while anchored", async () => {
    const app = mount(h("p", null, "Status: ", "loading results"));
    anchor(app.container);
    expect(anchoredWords(app.container)).toEqual(["Sta", "loa", "res"]);

    app.render(h("p", null, "Status: ", "done"));
    await settle();

    expect(app.container.textContent).toBe("Status: done");
    expect(anchoredWords(app.container)).toEqual(["Sta", "do"]);
    expect(app.errors).toEqual([]);
  });

  it("lets React remove anchored text without crashing", async () => {
    const app = mount(h("p", null, "Status: ", "loading results"));
    anchor(app.container);

    app.render(h("p", null, "Status: ", null));
    await settle();

    expect(app.errors).toEqual([]);
    expect(app.container.textContent).toBe("Status: ");
    expect(app.container.querySelector("p")).not.toBeNull();
  });

  it("handles elements whose only child is text", async () => {
    const app = mount(h("p", null, "Single text child"));
    anchor(app.container);

    app.render(h("p", null, "Replaced single child"));
    await settle();

    expect(app.container.textContent).toBe("Replaced single child");
    expect(anchoredWords(app.container)).toEqual(["Repl", "sin", "ch"]);
    expect(app.errors).toEqual([]);
  });

  it("keeps keyed list items and their anchors in order when React reorders them", async () => {
    const list = (items: string[]): ReactNode =>
      h(
        "ul",
        null,
        items.map((item) => h("li", { key: item }, `${item} item`))
      );
    const app = mount(list(["Alpha", "Bravo", "Charlie"]));
    anchor(app.container);

    app.render(list(["Charlie", "Alpha", "Bravo", "Delta"]));
    await settle();

    expect(Array.from(app.container.querySelectorAll("li"), (li) => li.textContent)).toEqual([
      "Charlie item",
      "Alpha item",
      "Bravo item",
      "Delta item"
    ]);
    expect(app.errors).toEqual([]);
  });

  it("survives unmounting and restores cleanly afterwards", async () => {
    const app = mount(h("section", null, h("h2", null, "Title"), h("p", null, "Body ", "text ", "parts")));
    const controller = anchor(app.container);
    app.unmount();
    await settle();
    controller.destroy();

    expect(app.errors).toEqual([]);
    expect(app.container.innerHTML).toBe("");
  });

  it("restores React's own nodes when disabled, so later updates still work", async () => {
    const app = mount(h("p", null, "Hello ", "world"));
    const paragraph = app.container.querySelector("p")!;
    const [first, second] = Array.from(paragraph.childNodes);
    const controller = anchor(app.container);
    controller.disable();

    expect(Array.from(paragraph.childNodes)).toEqual([first, second]);
    app.render(h("p", null, "Hello ", "again"));
    expect(paragraph.textContent).toBe("Hello again");
    expect(app.errors).toEqual([]);
  });
});

describe("React 19 and the highlight renderer", () => {
  it("never changes React's DOM and follows its updates", async () => {
    const api = installFakeHighlightApi();
    try {
      const app = mount(h("p", null, "Count: ", 0, " readers"));
      const before = app.container.innerHTML;
      anchor(app.container, { renderer: "highlight" });
      expect(app.container.innerHTML).toBe(before);
      expect(api.highlightedText()).toEqual(["Co", "rea"]);

      app.render(h("p", null, "Total: ", 5, " readers"));
      await settle();
      expect(app.container.textContent).toBe("Total: 5 readers");
      expect(api.highlightedText()).toEqual(["rea", "To"]);
      expect(app.errors).toEqual([]);
    } finally {
      api.uninstall();
    }
  });
});
