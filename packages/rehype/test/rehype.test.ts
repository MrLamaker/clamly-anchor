import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import rehypeAnchor, { type RehypeAnchorOptions } from "../src/index";

const B = (text: string): string => `<b class="clamly-anchor-bold" data-clamly-anchor="fixation">${text}</b>`;

async function run(html: string, options?: RehypeAnchorOptions): Promise<string> {
  const file = await unified().use(rehypeParse, { fragment: true }).use(rehypeAnchor, options).use(rehypeStringify).process(html);
  return String(file);
}

describe("rehype-anchor", () => {
  it("anchors paragraphs and leaves code, headings and links' targets alone", async () => {
    expect(
      await run('<h2>Title here</h2><p>Reading <a href="/dense">dense</a> material.</p><pre><code>const value = 1;</code></pre>')
    ).toBe(
      `<h2>Title here</h2><p>${B("Rea")}ding <a href="/dense">${B("de")}nse</a> ${B("mate")}rial.</p><pre><code>const value = 1;</code></pre>`
    );
  });

  it("keeps the alternating rhythm inside each paragraph", async () => {
    expect(await run("<p>One two <em>three</em> four</p><p>Five six</p>", { cadence: "alternating" })).toBe(
      `<p>${B("O")}ne two <em>${B("th")}ree</em> four</p><p>${B("Fi")}ve six</p>`
    );
  });

  it("uses lang attributes for saccade stop words", async () => {
    expect(await run('<p lang="de">der Hund und die Katze</p>', { cadence: "saccade" })).toBe(
      `<p lang="de">der ${B("Hu")}nd und die ${B("Ka")}tze</p>`
    );
  });

  it("honours opt-outs, SVG, already-anchored paragraphs and widgets", async () => {
    const html =
      '<p data-anchor="off">Skip me</p><p translate="no">Brand</p><svg><text>Label text</text></svg>' +
      `<p>${B("Al")}ready done</p><div role="button">Click here</div>`;
    expect(await run(html)).toBe(
      `<p data-anchor="off">Skip me</p><p translate="no">Brand</p><svg><text>Label text</text></svg><p>${B("Al")}ready done</p><div role="button">Click here</div>`
    );
  });

  it("is idempotent: running twice changes nothing", async () => {
    const once = await run("<p>Reading dense material</p><ul><li>First item</li></ul>");
    expect(await run(once)).toBe(once);
  });

  it("can anchor bold text when asked", async () => {
    expect(await run("<p><strong>Strong words</strong></p>", { skipBoldText: false })).toBe(
      `<p><strong>${B("Str")}ong ${B("wo")}rds</strong></p>`
    );
  });

  it("anchors the text of MDX components unless they opt out", () => {
    const tree = {
      type: "root",
      children: [
        { type: "mdxJsxFlowElement", name: "Callout", attributes: [], children: [{ type: "text", value: "Callout text" }] },
        {
          type: "mdxJsxFlowElement",
          name: "Note",
          attributes: [{ type: "mdxJsxAttribute", name: "data-anchor", value: "off" }],
          children: [{ type: "text", value: "Quiet note" }]
        }
      ]
    };
    rehypeAnchor()(tree as never);
    expect(JSON.stringify(tree)).toContain('"value":"Cal"');
    expect(JSON.stringify(tree)).toContain('"value":"Quiet note"');
  });

  it("rejects invalid options when configured", () => {
    expect(() => rehypeAnchor({ fixationStrength: 300 })).toThrow(/fixationStrength/);
    expect(() => rehypeAnchor({ skipTags: [""] })).toThrow(/skipTags/);
  });
});
