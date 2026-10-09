// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { type AnchorController, createAnchor } from "../src/index";
import { anchoredWords, installFakeHighlightApi, settle } from "./helpers";

const controllers: AnchorController[] = [];

function setup(html: string): HTMLElement {
  const root = document.createElement("article");
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

function anchor(root: Element, options: Parameters<typeof createAnchor>[1] = {}): AnchorController {
  const controller = createAnchor(root, { renderer: "dom", ...options });
  controllers.push(controller);
  controller.flush();
  return controller;
}

afterEach(() => {
  for (const controller of controllers.splice(0)) controller.destroy();
  document.body.replaceChildren();
});

describe("createAnchor with the DOM renderer", () => {
  it("anchors the root and restores the page exactly when disabled", () => {
    const root = setup("<p>Reading dense material.</p><p>Second <em>paragraph</em> here.</p>");
    const before = root.innerHTML;
    const controller = anchor(root);

    expect(controller.renderer).toBe("dom");
    expect(anchoredWords(root)).toEqual(["Rea", "de", "mate", "Sec", "para", "he"]);
    controller.disable();
    expect(root.innerHTML).toBe(before);

    controller.enable();
    controller.flush();
    expect(anchoredWords(root)).toHaveLength(6);
  });

  it("never touches the page while disabled", async () => {
    const root = setup("<p>Hello </p>");
    root.querySelector("p")!.append(document.createTextNode("world"));
    const records: MutationRecord[] = [];
    const spy = new MutationObserver((batch) => records.push(...batch));
    spy.observe(document, { subtree: true, childList: true, characterData: true, attributes: true });

    const controller = createAnchor(document, { enabled: false });
    controllers.push(controller);
    await settle();
    controller.destroy();
    await settle();

    spy.disconnect();
    expect(records).toEqual([]);
    expect(root.querySelector("p")!.childNodes).toHaveLength(2);
  });

  it("follows text the page changes in place", async () => {
    const root = setup("<p>Original words</p>");
    const node = root.querySelector("p")!.firstChild as Text;
    anchor(root);

    node.data = "Changed sentence here";
    await settle();

    expect(node.data).toBe("");
    expect(root.textContent).toBe("Changed sentence here");
    expect(anchoredWords(root)).toEqual(["Cha", "sent", "he"]);
  });

  it("respects the page emptying a text node", async () => {
    const root = setup("<p>Some words</p>");
    const node = root.querySelector("p")!.firstChild as Text;
    anchor(root);

    node.data = "";
    await settle();

    expect(root.querySelector('[data-clamly-anchor="text"]')).toBeNull();
    expect(node.data).toBe("");
    expect(root.textContent).toBe("");
  });

  it("keeps the copy next to its text node when the page inserts content", async () => {
    const root = setup("<p>First part</p>");
    const paragraph = root.querySelector("p")!;
    const node = paragraph.firstChild as Text;
    anchor(root);

    const inserted = document.createElement("strong");
    inserted.textContent = "!";
    node.after(inserted);
    await settle();

    expect(paragraph.childNodes[1]).toBe(root.querySelector('[data-clamly-anchor="text"]'));
    expect(paragraph.lastChild).toBe(inserted);
    expect(paragraph.textContent).toBe("First part!");
  });

  it("redraws a copy the page removed and cleans up after removed text", async () => {
    const root = setup("<p>Keep reading</p><p>Remove me</p>");
    anchor(root);

    root.querySelector('[data-clamly-anchor="text"]')!.remove();
    await settle();
    expect(root.querySelector("p")!.textContent).toBe("Keep reading");

    const second = root.querySelectorAll("p")[1]!;
    const node = second.firstChild as Text;
    node.remove();
    await settle();
    expect(second.childNodes).toHaveLength(0);
  });

  it("anchors content added later", async () => {
    const root = setup("<p>Existing</p>");
    const controller = anchor(root);
    const added = document.createElement("p");
    added.textContent = "Fresh content";
    root.append(added);
    await settle();
    controller.flush();
    expect(anchoredWords(added)).toEqual(["Fr", "con"]);
  });

  it("applies new options to anchored content", () => {
    const root = setup("<p>Original content</p>");
    const controller = anchor(root);
    controller.update({ fixationStrength: 80, cadence: "alternating" });
    controller.flush();
    expect(anchoredWords(root)).toEqual(["Origin"]);
    expect(root.textContent).toBe("Original content");
  });

  it("reacts when a region opts out or back in at runtime", async () => {
    const root = setup("<section><p>Toggle this text</p></section>");
    const controller = anchor(root);
    const section = root.querySelector("section")!;

    section.setAttribute("data-anchor", "off");
    await settle();
    expect(section.innerHTML).toBe("<p>Toggle this text</p>");

    section.removeAttribute("data-anchor");
    await settle();
    controller.flush();
    expect(anchoredWords(section)).toEqual(["Tog", "th", "te"]);
  });

  it("backs off from scripts that keep rewriting anchored text", async () => {
    const root = setup("<p>Stubborn text</p>");
    const paragraph = root.querySelector("p")!;
    let resets = 0;
    const fighter = new MutationObserver(() => {
      if (paragraph.children.length > 0) {
        resets++;
        paragraph.textContent = "Stubborn text";
      }
    });
    fighter.observe(paragraph, { childList: true, subtree: true });
    anchor(root);
    for (let i = 0; i < 20; i++) await settle();
    fighter.disconnect();

    expect(resets).toBeLessThan(60);
    expect(paragraph.innerHTML).toBe("Stubborn text");
  });

  it("is destroyed by an abort signal and cannot be reused", () => {
    const root = setup("<p>Abortable text</p>");
    const abort = new AbortController();
    const controller = anchor(root, { signal: abort.signal });
    abort.abort();
    expect(controller.enabled).toBe(false);
    expect(root.innerHTML).toBe("<p>Abortable text</p>");
    expect(() => controller.enable()).toThrow(/destroyed/);
  });

  it("validates its options", () => {
    const root = setup("<p>x</p>");
    expect(() => createAnchor(root, { renderer: "canvas" as "dom" })).toThrow(/renderer must be/);
    expect(() => createAnchor(root, { lazy: "yes" as unknown as boolean })).toThrow(/lazy must be a boolean/);
    expect(() => createAnchor("body" as unknown as Element)).toThrow(TypeError);
  });
});

describe("createAnchor with the highlight renderer", () => {
  it("falls back to the DOM renderer, or draws nothing when highlight is required", () => {
    const root = setup("<p>No highlight API in jsdom</p>");
    expect(createAnchor(root, { enabled: false }).renderer).toBe("dom");
    const strict = anchor(root, { renderer: "highlight" });
    expect(strict.renderer).toBe("none");
    expect(root.innerHTML).toBe("<p>No highlight API in jsdom</p>");
  });

  it("styles ranges without changing the DOM and follows text changes", async () => {
    const api = installFakeHighlightApi();
    try {
      const root = setup('<p>Highlight only <a href="#">links too</a></p><p lang="ar">مرحبا بالعالم</p>');
      const before = root.innerHTML;
      const controller = anchor(root, { renderer: "auto" });

      expect(controller.renderer).toBe("highlight");
      expect(root.innerHTML).toBe(before);
      // Cursive scripts stay joined with highlights, so Arabic is anchored here.
      expect(api.highlightedText()).toEqual(["High", "on", "li", "t", "مر", "بال"]);

      (root.querySelector("a")!.firstChild as Text).data = "changed";
      await settle();
      expect(api.highlightedText()).toEqual(["High", "on", "مر", "بال", "cha"]);
      expect(root.innerHTML).toBe(before.replace("links too", "changed"));

      controller.destroy();
      expect(api.registry.has("clamly-anchor")).toBe(false);
    } finally {
      api.uninstall();
    }
  });
});
