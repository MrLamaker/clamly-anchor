import { describe, expect, it } from "vitest";
import {
  type AnchorOptions,
  assertValidAnchorOptions,
  calculateReadingMetrics,
  getAnchorSpans,
  getWordParts,
  graphemeClusters,
  isAnchorOptions,
  processText,
  splitText
} from "../src/index";

/** Renders segments with bold parts in [brackets] for readable assertions. */
function show(text: string, options?: AnchorOptions): string {
  return splitText(text, options)
    .map((segment) => (segment.bold ? `[${segment.value}]` : segment.value))
    .join("");
}

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

  it("never splits an Indic conjunct", () => {
    expect(getWordParts("हिन्दी")).toEqual({ prefix: "हि", suffix: "न्दी" });
  });

  it("keeps combining marks with their letter", () => {
    const decomposed = "naïve".normalize("NFD");
    const { prefix, suffix } = getWordParts(decomposed, { fixationStrength: 60 });
    expect(prefix + suffix).toBe(decomposed);
    expect(prefix).toBe("naï");
    expect(/^\p{M}/u.test(suffix)).toBe(false);
  });
});

describe("graphemeClusters", () => {
  it("groups marks, viramas and joiners into user-perceived characters", () => {
    expect(graphemeClusters("naïve".normalize("NFD"))).toHaveLength(5);
    expect(graphemeClusters("हिन्दी")).toEqual(["हि", "न्दी"]);
    expect(graphemeClusters("ក្រុម")).toEqual(["ក្រុ", "ម"]);
    expect(graphemeClusters("plain")).toEqual(["p", "l", "a", "i", "n"]);
  });
});

describe("splitText", () => {
  it("preserves the text exactly and merges plain runs", () => {
    expect(splitText("Hi, lumea!")).toEqual([
      { value: "H", bold: true },
      { value: "i, ", bold: false },
      { value: "lu", bold: true },
      { value: "mea!", bold: false }
    ]);
    const text = "Reading — dense, “material” (2026) & more…";
    expect(
      splitText(text)
        .map((segment) => segment.value)
        .join("")
    ).toBe(text);
  });

  it("anchors each part of a hyphenated compound", () => {
    expect(show("A state-of-the-art paper")).toBe("[A] [st]ate-[o]f-[t]he-[a]rt [pa]per");
  });

  it("keeps apostrophes inside words but not after them", () => {
    expect(show("don't stop the students' plan")).toBe("[do]n't [st]op [t]he [stud]ents' [pl]an");
  });

  it("leaves numbers alone unless asked", () => {
    expect(show("In 2026, 1,250 students scored 3.14")).toBe("[I]n 2026, 1,250 [stud]ents [sco]red 3.14");
    expect(show("COVID-19 and H2O")).toBe("[CO]VID-19 [a]nd H2O");
    expect(show("In 2026", { anchorNumbers: true })).toBe("[I]n [20]26");
  });

  it("never anchors inside URLs or email addresses", () => {
    expect(show("Visit https://example.com/reading or write to team@clamly.app today")).toBe(
      "[Vi]sit https://example.com/reading [o]r [wr]ite [t]o team@clamly.app [to]day"
    );
    expect(show("See www.clamly.app now")).toBe("[S]ee www.clamly.app [n]ow");
  });

  it("skips scripts written without spaces by default", () => {
    expect(show("我喜欢学习中文。")).toBe("我喜欢学习中文。");
    expect(show("ภาษาไทยเป็นภาษาที่สวยงาม")).toBe("ภาษาไทยเป็นภาษาที่สวยงาม");
    expect(show("Learn 中文 today")).toBe("[Le]arn 中文 [to]day");
  });

  it("splits opted-in no-space scripts into dictionary words", () => {
    const thai = splitText("ภาษาไทยเป็นภาษาที่สวยงาม", { skipScripts: [] });
    expect(thai.filter((segment) => segment.bold).length).toBeGreaterThan(2);
    expect(thai.map((segment) => segment.value).join("")).toBe("ภาษาไทยเป็นภาษาที่สวยงาม");
  });

  it("keeps cursive scripts joined in markup unless told otherwise", () => {
    expect(show("مرحبا بالعالم")).toBe("مرحبا بالعالم");
    expect(show("مرحبا بالعالم", { skipScripts: [] })).toBe("[مر]حبا [بال]عالم");
  });

  it("handles alternating cadence by anchoring every second word", () => {
    expect(show("One two three four", { cadence: "alternating" })).toBe("[O]ne two [th]ree four");
  });

  it("leaves English stop words soft in saccade cadence by default", () => {
    expect(show("the quick brown fox", { cadence: "saccade" })).toBe("the [qu]ick [br]own [f]ox");
  });

  it("uses stop words for the locale's language", () => {
    expect(show("der schnelle Hund und die Katze", { cadence: "saccade", locale: "de-AT" })).toBe("der [schn]elle [Hu]nd und die [Ka]tze");
    // No built-in list for Polish: borrowing English would wrongly skip "to" ("this").
    expect(show("to jest kot", { cadence: "saccade", locale: "pl" })).toBe("[t]o [je]st [k]ot");
    expect(show("a big dog", { cadence: "saccade", stopWords: ["big"] })).toBe("[a] big [d]og");
  });

  it("matches skip words regardless of case, normalization and Romanian cedillas", () => {
    expect(show("API design api", { skipWords: ["api"] })).toBe("API [des]ign api");
    expect(show("CAFÉ café", { skipWords: ["café".normalize("NFD")] })).toBe("CAFÉ café");
    expect(show("pâine şi lapte", { cadence: "saccade", locale: "ro" })).toBe("[pâ]ine şi [la]pte");
  });

  it("passes the original word and its index to custom selection policies", () => {
    const calls: unknown[] = [];
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

describe("getAnchorSpans", () => {
  it("returns UTF-16 offsets of each prefix", () => {
    expect(getAnchorSpans("Reading 📚 dense")).toEqual([
      { start: 0, end: 3 },
      { start: 11, end: 13 }
    ]);
  });
});

describe("processText", () => {
  it("returns escaped HTML with generated-markup attributes", () => {
    expect(processText("Read <fast> & safely")).toBe(
      '<b class="clamly-anchor-bold" data-clamly-anchor="fixation">Re</b>ad &lt;<b class="clamly-anchor-bold" data-clamly-anchor="fixation">fa</b>st&gt; &amp; <b class="clamly-anchor-bold" data-clamly-anchor="fixation">saf</b>ely'
    );
  });
});

describe("option validation", () => {
  it("accepts valid options and rejects invalid values instead of coercing them", () => {
    expect(isAnchorOptions({ fixationStrength: 45, minimumWordLength: 2, cadence: "all", locale: "ro-RO", skipScripts: ["Latin"] })).toBe(
      true
    );
    expect(isAnchorOptions({ fixationStrength: 101 })).toBe(false);
    expect(isAnchorOptions({ skipWords: [""] })).toBe(false);
    expect(isAnchorOptions({ shouldAnchorWord: true })).toBe(false);
    expect(isAnchorOptions({ locale: "en_US" })).toBe(false);
    expect(isAnchorOptions({ anchorNumbers: "yes" })).toBe(false);
    expect(isAnchorOptions([])).toBe(false);
    expect(() => splitText("text", { minimumWordLength: 1.5 })).toThrow(TypeError);
  });

  it("names every invalid option in one error", () => {
    expect(() => assertValidAnchorOptions({ fixationStrength: 120, cadence: "fast", skipScripts: ["Latin", "Klingon"] })).toThrow(
      /fixationStrength must be a number from 0 to 100 \(received 120\); cadence must be .* \(received "fast"\); skipScripts contains unknown Unicode scripts: Klingon/
    );
  });
});

describe("calculateReadingMetrics", () => {
  it("describes the passage without claiming a speed gain", () => {
    const sample = "Reading dense material asks a lot of our attention.";
    const metrics = calculateReadingMetrics(sample);
    expect(metrics).toEqual({
      wordCount: 9,
      characterCount: sample.length,
      fixationCount: 9,
      fixationDensityPercentage: 100,
      wordsPerMinute: 238,
      estimatedReadingTimeSeconds: 2
    });
  });

  it("reflects cadence and a custom reading rate", () => {
    const metrics = calculateReadingMetrics("one two three four", { cadence: "alternating", wordsPerMinute: 120 });
    expect(metrics.fixationCount).toBe(2);
    expect(metrics.fixationDensityPercentage).toBe(50);
    expect(metrics.estimatedReadingTimeSeconds).toBe(2);
  });

  it("counts words in no-space scripts and user-perceived characters", () => {
    expect(calculateReadingMetrics("我喜欢学习中文").wordCount).toBeGreaterThan(1);
    expect(calculateReadingMetrics("👍🏽 ok").characterCount).toBe(4);
  });

  it("handles empty text and rejects an invalid rate", () => {
    expect(calculateReadingMetrics("")).toMatchObject({ wordCount: 0, fixationCount: 0, estimatedReadingTimeSeconds: 0 });
    expect(() => calculateReadingMetrics("text", { wordsPerMinute: 0 })).toThrow(TypeError);
  });
});
