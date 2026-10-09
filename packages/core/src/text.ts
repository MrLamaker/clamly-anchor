import { normalizeWord, type ResolvedAnchorOptions, resolveOptions } from "./options";
import { NO_SPACE_SCRIPTS, scriptPattern } from "./scripts";
import type { AnchorOptions, AnchorSpan, TextSegment, WordParts } from "./types";

// A word is a run of letters, marks and digits. Apostrophes stay inside a word
// only between word characters ("don't"); hyphens split compounds so each part
// gets its own anchor ("state-of-the-art"). These rules are deliberately our
// own rather than Intl.Segmenter's, whose results differ between engines and
// would make server-rendered markup disagree with the browser during hydration.
const WORD_PATTERN = /[\p{L}\p{N}](?:[\p{L}\p{M}\p{N}‌‍]|['’](?=[\p{L}\p{N}]))*/gu;
const PROTECTED_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"'`]+|[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
const DIGIT = /\p{N}/u;
const MARK = /\p{M}/u;
const PRINTABLE_ASCII = /^[\x20-\x7e]*$/;
const ZWNJ = 0x200c;
const ZWJ = 0x200d;

// Viramas join the next consonant into a conjunct, so a split point must never
// follow one. Unicode 15.1 grapheme rules cover some of these scripts; listing
// them here keeps older engines and the remaining scripts correct too.
const VIRAMAS: ReadonlySet<number> = new Set([
  0x094d, 0x09cd, 0x0a4d, 0x0acd, 0x0b4d, 0x0bcd, 0x0c4d, 0x0ccd, 0x0d4d, 0x0dca, 0x0f84, 0x1039, 0x17d2, 0x1a60, 0x1b44, 0xa8c4, 0xa9c0,
  0x11046, 0x110b9, 0x111c0, 0x11235, 0x1134d
]);

/** Running word counter, shared across the text nodes of one paragraph. */
export interface PlanState {
  wordIndex: number;
}

/**
 * Splits a word into user-perceived characters without breaking combining
 * marks, Indic conjuncts, zero-width joiner sequences or Hangul jamo.
 */
export function graphemeClusters(word: string): string[] {
  if (PRINTABLE_ASCII.test(word)) return word.split("");
  const clusters: string[] = [];
  let current = "";
  let joinNext = false;
  for (const character of word) {
    const codePoint = character.codePointAt(0) ?? 0;
    const attaches =
      current !== "" &&
      (joinNext ||
        codePoint === ZWJ ||
        codePoint === ZWNJ ||
        MARK.test(character) ||
        (codePoint >= 0x1160 && codePoint <= 0x11ff) ||
        (codePoint >= 0xd7b0 && codePoint <= 0xd7ff));
    if (attaches) {
      current += character;
    } else {
      if (current !== "") clusters.push(current);
      current = character;
    }
    joinNext = codePoint === ZWJ || VIRAMAS.has(codePoint);
  }
  if (current !== "") clusters.push(current);
  return clusters;
}

function prefixClusterCount(length: number, strength: number): number {
  // Short words keep one visual point; longer words use the configured share
  // while always leaving at least one character unanchored.
  if (length <= 3) return 1;
  return Math.min(length - 1, Math.max(1, Math.round((length * strength) / 100)));
}

/** Returns the anchored prefix length (UTF-16 units) for one word, or 0 to leave it unanchored. */
function anchorLength(word: string, index: number, options: ResolvedAnchorOptions): number {
  if (options.fixationStrength === 0) return 0;
  if (!options.anchorNumbers && DIGIT.test(word)) return 0;
  if (options.cadence === "alternating" && index % 2 === 1) return 0;

  const clusters = graphemeClusters(word);
  if (clusters.length < options.minimumWordLength) return 0;

  if (options.skipWords.size > 0 || options.stopWords.size > 0 || options.shouldAnchorWord) {
    const normalizedWord = normalizeWord(word, options.locale);
    if (options.stopWords.has(normalizedWord) || options.skipWords.has(normalizedWord)) return 0;
    if (options.shouldAnchorWord?.({ word, normalizedWord, index }) === false) return 0;
  }

  const count = prefixClusterCount(clusters.length, options.fixationStrength);
  let length = 0;
  for (let i = 0; i < count; i++) length += clusters[i]?.length ?? 0;
  return length;
}

function protectedRanges(text: string): Array<[number, number]> {
  if (!text.includes("@") && !text.includes("://") && !text.includes("www.")) return [];
  return Array.from(text.matchAll(PROTECTED_PATTERN), (match) => [match.index ?? 0, (match.index ?? 0) + match[0].length]);
}

const segmenters = new Map<string, Intl.Segmenter>();

function dictionaryWords(text: string, locale: string | undefined): Array<{ segment: string; index: number }> {
  if (typeof Intl.Segmenter !== "function") return [{ segment: text, index: 0 }];
  const key = locale ?? "";
  let segmenter = segmenters.get(key);
  if (!segmenter) {
    segmenter = new Intl.Segmenter(locale, { granularity: "word" });
    segmenters.set(key, segmenter);
  }
  const words: Array<{ segment: string; index: number }> = [];
  for (const part of segmenter.segment(text)) if (part.isWordLike) words.push({ segment: part.segment, index: part.index });
  return words;
}

/**
 * Finds the fixation prefixes in a string. `state` carries the word counter
 * across strings that belong to the same paragraph.
 */
export function planAnchors(text: string, options: ResolvedAnchorOptions, state: PlanState = { wordIndex: 0 }): AnchorSpan[] {
  const spans: AnchorSpan[] = [];
  if (text === "" || options.fixationStrength === 0) return spans;
  const ranges = protectedRanges(text);
  let rangeIndex = 0;

  const planWord = (word: string, start: number): void => {
    const length = anchorLength(word, state.wordIndex++, options);
    if (length > 0) spans.push({ start, end: start + length });
  };

  for (const match of text.matchAll(WORD_PATTERN)) {
    const word = match[0];
    const start = match.index ?? 0;
    const end = start + word.length;

    while (rangeIndex < ranges.length && (ranges[rangeIndex]?.[1] ?? 0) <= start) rangeIndex++;
    if ((ranges[rangeIndex]?.[0] ?? Number.POSITIVE_INFINITY) < end) continue; // part of a URL or email address
    if (options.skipScriptPattern?.test(word)) continue;

    if (options.segmentPattern?.test(word)) {
      for (const part of dictionaryWords(word, options.locale)) planWord(part.segment, start + part.index);
      continue;
    }
    planWord(word, start);
  }
  return spans;
}

/** Counts words, splitting runs of no-space scripts with Intl.Segmenter when it is available. */
export function countWords(text: string, locale?: string): number {
  const noSpace = scriptPattern(NO_SPACE_SCRIPTS);
  let count = 0;
  for (const match of text.matchAll(WORD_PATTERN)) {
    count += noSpace?.test(match[0]) ? Math.max(1, dictionaryWords(match[0], locale).length) : 1;
  }
  return count;
}

/** Converts fixation spans into alternating plain and bold fragments that cover the whole text. */
export function segmentsFromSpans(text: string, spans: readonly AnchorSpan[]): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) segments.push({ value: text.slice(cursor, span.start), bold: false });
    segments.push({ value: text.slice(span.start, span.end), bold: true });
    cursor = span.end;
  }
  if (cursor < text.length) segments.push({ value: text.slice(cursor), bold: false });
  return segments;
}

/** Returns the fixation prefixes of a string as UTF-16 offsets, for custom renderers. */
export function getAnchorSpans(text: string, options: AnchorOptions = {}): AnchorSpan[] {
  return planAnchors(text, resolveOptions(options));
}

/** Splits plain text into normal and bold fragments while preserving it exactly. */
export function splitText(text: string, options: AnchorOptions = {}): TextSegment[] {
  return segmentsFromSpans(text, planAnchors(text, resolveOptions(options)));
}

/**
 * Produces escaped HTML with presentational `<b>` fixation prefixes, for
 * server-side rendering and other environments without a DOM.
 */
export function processText(text: string, options: AnchorOptions = {}): string {
  return splitText(text, options)
    .map(({ value, bold }) =>
      bold ? `<b class="clamly-anchor-bold" data-clamly-anchor="fixation">${escapeHtml(value)}</b>` : escapeHtml(value)
    )
    .join("");
}

/**
 * Calculates the fixation point for one word without creating markup.
 * An empty prefix means the word stays unstyled.
 */
export function getWordParts(word: string, options: AnchorOptions = {}): WordParts {
  const resolved = resolveOptions(options);
  if (resolved.skipScriptPattern?.test(word)) return { prefix: "", suffix: word };
  const length = anchorLength(word, 0, resolved);
  return { prefix: word.slice(0, length), suffix: word.slice(length) };
}

const HTML_ESCAPES: Readonly<Record<string, string>> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}
