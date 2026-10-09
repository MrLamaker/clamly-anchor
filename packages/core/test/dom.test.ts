// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { processElement, restoreElement } from "../src/index";

const anchored = (root: Element): string[] =>
  Array.from(root.querySelectorAll('b[data-clamly-anchor="fixation"]'), (bold) => bold.textContent ?? "");

function setup(html: string): HTMLElement {
  const root = document.createElement("main");
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("processElement", () => {
  it("anchors visible text and skips protected tags", () => {
    const root = setup("<p>Dense reading.</p><code>const untouched = true;</code><button>Leave this alone</button>");
    processElement(root);
    expect(anchored(root)).toEqual(["De", "rea"]);
    expect(root.querySelector("code")?.innerHTML).toBe("const untouched = true;");
    expect(root.querySelector("button")?.innerHTML).toBe("Leave this alone");
    expect(root.textContent).toBe("Dense reading.const untouched = true;Leave this alone");
  });

  it("keeps the page's own text node in place and follows it with the anchored copy", () => {
    const root = setup("<p></p>");
    const paragraph = root.querySelector("p")!;
    const original = document.createTextNode("Original content");
    paragraph.append(original);

    processElement(root);

    expect(paragraph.firstChild).toBe(original);
    expect(original.data).toBe("");
    expect(original.nextSibling).toBe(paragraph.querySelector('[data-clamly-anchor="text"]'));
    expect(paragraph.textContent).toBe("Original content");
  });

  it("restores exactly: same nodes, same text, nothing merged or left behind", () => {
    const root = setup("<p></p>");
    const paragraph = root.querySelector("p")!;
    const first = document.createTextNode("Hello ");
    const second = document.createTextNode("world");
    paragraph.append(first, second);
    const before = paragraph.innerHTML;

    processElement(root);
    restoreElement(root);

    expect(Array.from(paragraph.childNodes)).toEqual([first, second]);
    expect(first.data).toBe("Hello ");
    expect(second.data).toBe("world");
    expect(paragraph.innerHTML).toBe(before);
    expect(root.querySelector("[data-clamly-anchor]")).toBeNull();
  });

  it("is idempotent and redraws with new options", () => {
    const root = setup("<p>Original content remains readable.</p>");
    processElement(root);
    const html = root.innerHTML;
    processElement(root);
    expect(root.innerHTML).toBe(html);

    processElement(root, { fixationStrength: 80 });
    expect(anchored(root)[0]).toBe("Origin");
    expect(root.querySelectorAll('[data-clamly-anchor="text"]')).toHaveLength(1);
    expect(root.textContent).toBe("Original content remains readable.");
  });

  it("restores markup created by version 0.2", () => {
    const root = setup(
      '<p><span data-clamly-anchor="text" style="display: inline;"><b data-clamly-anchor="fixation" class="clamly-anchor-bold">Ol</b>d</span></p>'
    );
    restoreElement(root);
    expect(root.innerHTML).toBe("<p>Old</p>");
  });

  it("keeps one inline unit per text node in flex layouts", () => {
    const root = setup('<a style="display: flex">Get Started</a>');
    processElement(root);
    const wrapper = root.querySelector<HTMLElement>('[data-clamly-anchor="text"]');
    expect(wrapper?.style.display).toBe("inline");
    expect(wrapper?.textContent).toBe("Get Started");
  });

  it("leaves SVG and MathML alone", () => {
    const root = setup('<p>Chart</p><svg><text x="0" y="10">Revenue growth</text></svg><math><mi>sin</mi><mtext>of angle</mtext></math>');
    const svg = root.querySelector("svg")!.innerHTML;
    const math = root.querySelector("math")!.innerHTML;
    processElement(root);
    expect(root.querySelector("svg")!.innerHTML).toBe(svg);
    expect(root.querySelector("math")!.innerHTML).toBe(math);
    expect(anchored(root)).toEqual(["Ch"]);
  });

  it("honours opt-outs, editable regions, widgets, live regions and hidden content", () => {
    const root = setup(`
      <p data-anchor="off">Site owner opted out</p>
      <p translate="no">Brand Name</p>
      <div contenteditable="true"><p>Editable text</p></div>
      <div role="button">Custom button</div>
      <div role="tab">Tab label</div>
      <p aria-live="polite">Live update</p>
      <p aria-live="off">Quiet region</p>
      <p hidden>Hidden text</p>
      <details><summary>Question</summary><p>Answer text</p></details>`);
    processElement(root);
    expect(anchored(root)).toEqual(["Qu", "reg", "Ques", "Ans", "te"]);
  });

  it("supports custom skip tags, roles and selectors", () => {
    const root = setup('<aside>Leave aside</aside><p role="note">Note text</p><p class="price">Price label</p><p>Keep this</p>');
    processElement(root, { skipTags: ["ASIDE"], skipRoles: ["note"], skipSelector: ".price" });
    expect(anchored(root)).toEqual(["Ke", "th"]);
    expect(() => processElement(root, { skipSelector: "[[invalid" })).toThrow(/skipSelector must be a valid CSS selector/);
  });

  it("keeps the alternating rhythm across links and emphasis", () => {
    const root = setup("<p>One two <a>three</a> four <em>five</em> six seven</p>");
    processElement(root, { cadence: "alternating" });
    expect(anchored(root)).toEqual(["O", "th", "fi", "se"]);
    expect(root.textContent).toBe("One two three four five six seven");
  });

  it("uses each element's language for saccade stop words", () => {
    const root = setup('<p lang="de">der Hund und die Katze</p><p lang="en">the dog and the cat</p>');
    processElement(root, { cadence: "saccade" });
    expect(anchored(root)).toEqual(["Hu", "Ka", "d", "c"]);
  });

  it("skips text that is already bold", () => {
    const root = setup('<p><span style="font-weight: 700">Bold words</span> plain words</p>');
    processElement(root);
    expect(anchored(root)).toEqual(["pl", "wo"]);
  });

  it("leaves paragraphs with server-rendered anchors alone", () => {
    const root = setup('<p><b class="clamly-anchor-bold" data-clamly-anchor="fixation">Al</b>ready done</p><p>Fresh text</p>');
    processElement(root);
    expect(root.querySelector("p")!.innerHTML).toBe('<b class="clamly-anchor-bold" data-clamly-anchor="fixation">Al</b>ready done');
    expect(anchored(root)).toEqual(["Al", "Fr", "te"]);
  });

  it("reports each anchored text node", () => {
    const root = setup("<p>First sentence.</p><p>Second sentence.</p>");
    const processed: Array<{ originalText: string; fixationCount: number; sameNode: boolean }> = [];
    processElement(root, {
      onNodeProcessed: ({ originalText, fixationCount, node, wrapper }) => {
        processed.push({ originalText, fixationCount, sameNode: node.nextSibling === wrapper });
      }
    });
    expect(processed).toEqual([
      { originalText: "First sentence.", fixationCount: 2, sameNode: true },
      { originalText: "Second sentence.", fixationCount: 2, sameNode: true }
    ]);
  });

  it("validates its arguments", () => {
    expect(() => processElement(null as unknown as Element)).toThrow(TypeError);
    expect(() => processElement(document.body, { skipTags: [""] })).toThrow(/skipTags/);
    expect(() => processElement(document.body, { fixationStrength: -1 })).toThrow(/fixationStrength/);
  });
});
