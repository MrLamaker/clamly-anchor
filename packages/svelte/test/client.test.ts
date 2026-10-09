// @vitest-environment jsdom
import { flushSync, mount, unmount } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { AnchorText, anchor } from "../src/index";

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 10));
const anchored = (root: ParentNode): string[] =>
  Array.from(root.querySelectorAll('[data-clamly-anchor="fixation"]'), (b) => b.textContent ?? "");

afterEach(() => {
  document.body.replaceChildren();
});

describe("<AnchorText> in the browser", () => {
  it("mounts and renders anchored text", () => {
    const target = document.createElement("p");
    document.body.append(target);
    const component = mount(AnchorText, { target, props: { text: "Reading dense material" } });
    flushSync();
    expect(anchored(target)).toEqual(["Rea", "de", "mate"]);
    expect(target.textContent).toBe("Reading dense material");
    unmount(component);
  });
});

describe("use:anchor", () => {
  it("anchors an element, applies updates and restores it on destroy", async () => {
    const node = document.createElement("section");
    node.innerHTML = "<p>Original content</p>";
    document.body.append(node);

    const action = anchor(node, { renderer: "dom", lazy: false });
    await settle();
    expect(anchored(node)).toEqual(["Orig", "con"]);

    action?.update?.({ renderer: "dom", lazy: false, fixationStrength: 80 });
    await settle();
    expect(anchored(node)).toEqual(["Origin", "conten"]);

    action?.destroy?.();
    expect(node.innerHTML).toBe("<p>Original content</p>");
  });
});
