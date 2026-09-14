import { describe, expect, it } from "vitest";
import { calculateReadingMetrics, getWordParts, isAnchorOptions, processText, splitText } from "../src/processor";

describe("getWordParts", () => {
  it("anchors short words with their first letter", () => {
    expect(getWordParts("cat")).toEqual({ prefix: "c", suffix: "at" });
  });

  it("uses approximately 45% of longer words by default", () => {
    expect(getWordParts("reader")).toEqual({ prefix: "rea", suffix: "der" });
  });

  it("respects the minimum word length and strength", () => {
    expect(getWordParts("text", { minimumWordLength: 5 })).toEqual({ prefix: "", suffix: "text" });
    expect(getWordParts("text", { fixationStrength: 0 })).toEqual({ prefix: "", suffix: "text" });
  });
});

describe("splitText", () => {
  it("preserves whitespace, punctuation, and non-Latin letters", () => {
    expect(splitText("Hi, lumea!")).toEqual([
      { value: "H", bold: true },
      { value: "i", bold: false },
      { value: ", ", bold: false },
      { value: "lu", bold: true },
      { value: "mea", bold: false },
      { value: "!", bold: false }
    ]);
  });

  it("handles alternating cadence by anchoring every second word", () => {
    const text = "One two three four";
    const segments = splitText(text, { cadence: "alternating" });
    const boldSegments = segments.filter((s) => s.bold).map((s) => s.value);
    // Word 0 ('One') and Word 2 ('three') should be anchored, word 1 and 3 are not
    expect(boldSegments).toEqual(["O", "th"]);
  });

  it("handles saccade cadence by skipping short functional stop words", () => {
    const text = "the quick brown fox jumps over the lazy dog";
    const segments = splitText(text, { cadence: "saccade" });
    // 'the' is in SACCADE_STOP_WORDS, so it should have no bold segment
    const hasBoldThe = segments.some((s) => s.bold && s.value.toLowerCase().startsWith("th"));
    expect(hasBoldThe).toBe(false);
    // 'quick' should be anchored
    const hasBoldQuick = segments.some((s) => s.bold && s.value === "qu");
    expect(hasBoldQuick).toBe(true);
  });

  it("supports case-insensitive custom word dictionaries", () => {
    const segments = splitText("API design api", { skipWords: ["api"] });
    expect(segments.filter((segment) => segment.bold).map((segment) => segment.value)).toEqual(["des"]);
  });

  it("passes the original word and its index to custom selection policies", () => {
    const calls: Array<{ word: string; normalizedWord: string; index: number }> = [];
    const segments = splitText("Anchor only second", {
      shouldAnchorWord: (context) => {
        calls.push(context);
        return context.index === 1;
      }
    });

    expect(calls).toEqual([
      { word: "Anchor", normalizedWord: "anchor", index: 0 },
      { word: "only", normalizedWord: "only", index: 1 },
      { word: "second", normalizedWord: "second", index: 2 }
    ]);
    expect(segments.filter((segment) => segment.bold).map((segment) => segment.value)).toEqual(["on"]);
  });
});

describe("processText", () => {
  it("returns safe HTML without requiring a DOM", () => {
    expect(processText("Read <fast> & safely")).toBe('<b class="clamly-anchor-bold">Re</b>ad &lt;<b class="clamly-anchor-bold">fa</b>st&gt; &amp; <b class="clamly-anchor-bold">saf</b>ely');
  });
});

describe("option validation", () => {
  it("rejects invalid runtime values instead of coercing them", () => {
    expect(isAnchorOptions({ fixationStrength: 45, minimumWordLength: 2, cadence: "all" })).toBe(true);
    expect(isAnchorOptions({ fixationStrength: 101 })).toBe(false);
    expect(isAnchorOptions({ skipWords: [""] })).toBe(false);
    expect(isAnchorOptions({ shouldAnchorWord: true })).toBe(false);
    expect(() => splitText("text", { minimumWordLength: 1.5 })).toThrow(TypeError);
  });
});

describe("calculateReadingMetrics", () => {
  it("computes accurate reading statistics", () => {
    const sample = "Reading dense material asks a lot of our attention.";
    const metrics = calculateReadingMetrics(sample);

    expect(metrics.wordCount).toBe(9);
    expect(metrics.characterCount).toBe(sample.length);
    expect(metrics.fixationCount).toBeGreaterThan(0);
    expect(metrics.estimatedWordsPerMinute).toBeGreaterThanOrEqual(220);
    expect(metrics.standardReadingTimeSeconds).toBeGreaterThan(0);
    expect(metrics.anchoredReadingTimeSeconds).toBeLessThanOrEqual(metrics.standardReadingTimeSeconds);
    expect(metrics.fixationDensityPercentage).toBeGreaterThan(0);
  });

  it("handles empty text gracefully", () => {
    const metrics = calculateReadingMetrics("");
    expect(metrics.wordCount).toBe(0);
    expect(metrics.characterCount).toBe(0);
    expect(metrics.fixationCount).toBe(0);
    expect(metrics.standardReadingTimeSeconds).toBe(0);
    expect(metrics.anchoredReadingTimeSeconds).toBe(0);
  });
});
