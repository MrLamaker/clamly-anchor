// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "../src/element";
import { type AnchorController, createAnchor } from "../src/index";
import { createAnchorToggle } from "../src/toggle";
import { anchoredWords, settle } from "./helpers";

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute("data-anchor");
  localStorage.clear();
});

describe("<clamly-anchor>", () => {
  it("anchors its content and follows attribute changes", async () => {
    document.body.innerHTML = '<clamly-anchor renderer="dom"><p>Element based anchoring</p></clamly-anchor>';
    const element = document.querySelector("clamly-anchor")!;
    expect(element.controller?.renderer).toBe("dom");
    element.controller?.flush();
    expect(anchoredWords(element)).toEqual(["Ele", "ba", "anch"]);

    element.setAttribute("cadence", "alternating");
    element.controller?.flush();
    expect(anchoredWords(element)).toEqual(["Ele", "anch"]);

    element.setAttribute("disabled", "");
    expect(element.controller?.enabled).toBe(false);
    expect(element.innerHTML).toBe("<p>Element based anchoring</p>");
  });

  it("ignores invalid attribute values instead of throwing", () => {
    document.body.innerHTML = '<clamly-anchor renderer="dom" strength="lots" cadence="fast" locale="!!"><p>Still works</p></clamly-anchor>';
    const element = document.querySelector("clamly-anchor")!;
    element.controller?.flush();
    expect(anchoredWords(element)).toEqual(["St", "wo"]);
  });

  it("restores its content when removed from the page", async () => {
    document.body.innerHTML = '<clamly-anchor renderer="dom"><p>Temporary text</p></clamly-anchor>';
    const element = document.querySelector("clamly-anchor")!;
    element.controller?.flush();
    element.remove();
    expect(element.controller).toBeNull();
    expect(element.innerHTML).toBe("<p>Temporary text</p>");
  });
});

describe("createAnchorToggle", () => {
  let controller: AnchorController;

  beforeEach(() => {
    document.body.innerHTML = "<main><p>Toggle controlled text</p></main>";
    controller = createAnchor(document.querySelector("main")!, { renderer: "dom", enabled: false });
  });

  afterEach(() => controller.destroy());

  it("is an accessible switch that starts off and remembers the reader's choice", () => {
    const toggle = createAnchorToggle({ controller });
    const button = toggle.element;
    expect(button.tagName).toBe("BUTTON");
    expect(button.type).toBe("button");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.textContent).toBe("Aa" + "Reading anchors");
    expect(button.hasAttribute("data-floating")).toBe(true);
    expect(controller.enabled).toBe(false);

    button.click();
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(controller.enabled).toBe(true);
    expect(localStorage.getItem("clamly-anchor")).toBe("on");
    toggle.destroy();
    expect(document.querySelector(".clamly-anchor-toggle")).toBeNull();

    const again = createAnchorToggle({ controller });
    expect(again.enabled).toBe(true);
    again.destroy();
  });

  it("follows choices made in other tabs", () => {
    const toggle = createAnchorToggle({ controller, storageKey: "site-anchor" });
    window.dispatchEvent(new StorageEvent("storage", { key: "site-anchor", newValue: "on" }));
    expect(toggle.enabled).toBe(true);
    expect(controller.enabled).toBe(true);
    window.dispatchEvent(new StorageEvent("storage", { key: "other", newValue: "off" }));
    expect(toggle.enabled).toBe(true);
    toggle.destroy();
  });

  it("switches pre-rendered anchors through the data-anchor attribute", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const changes: boolean[] = [];
    const toggle = createAnchorToggle({
      container,
      defaultEnabled: true,
      storageKey: null,
      label: "Bold starts",
      onChange: (on) => changes.push(on)
    });
    expect(container.contains(toggle.element)).toBe(true);
    expect(toggle.element.hasAttribute("data-floating")).toBe(false);
    expect(document.documentElement.getAttribute("data-anchor")).toBe("on");

    toggle.set(false);
    expect(document.documentElement.getAttribute("data-anchor")).toBe("off");
    expect(changes).toEqual([true, false]);
    expect(localStorage.length).toBe(0);
    toggle.destroy();
    await settle();
  });
});
