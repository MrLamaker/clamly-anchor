import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import { AnchorText, anchorSegments } from "../src/index";

const B = (text: string): string => `<b class="clamly-anchor-bold" data-clamly-anchor="fixation">${text}</b>`;
/** Removes Svelte's hydration markers to compare the visible markup. */
const markup = (html: string): string => html.replace(/<!--[^>]*-->/g, "");

describe("<AnchorText> on the server", () => {
  it("renders anchored text", () => {
    const { body } = render(AnchorText, { props: { text: "Reading dense material" } });
    expect(markup(body)).toBe(`${B("Rea")}ding ${B("de")}nse ${B("mate")}rial`);
  });

  it("passes options through", () => {
    const { body } = render(AnchorText, { props: { text: "the quick brown fox", cadence: "saccade" } });
    expect(markup(body)).toBe(`the ${B("qu")}ick ${B("br")}own ${B("f")}ox`);
  });

  it("exposes segments for custom markup", () => {
    expect(anchorSegments("Hi there")).toEqual([
      { value: "H", bold: true },
      { value: "i ", bold: false },
      { value: "th", bold: true },
      { value: "ere", bold: false }
    ]);
  });
});
