import { SACCADE_STOP_WORDS } from "./constants";
import type { AnchorOptions, ReadingCadence, ReadingMetrics, TextSegment, WordAnchorContext, WordParts } from "./types";

const DEFAULT_STRENGTH = 45;
const DEFAULT_MINIMUM_WORD_LENGTH = 1;
const DEFAULT_CADENCE: ReadingCadence = "all";

// Letter and number runs are treated as words. Apostrophes and hyphens remain
// part of a word only when they occur after its first character.
const WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{M}\p{N}'’-]*/gu;

export interface ResolvedAnchorOptions {
  fixationStrength: number;
  minimumWordLength: number;
  cadence: ReadingCadence;
  skipWords: ReadonlySet<string>;
  shouldAnchorWord?: (context: WordAnchorContext) => boolean;
}

/** Returns whether an unknown value is a valid set of text-processing options. */
export function isAnchorOptions(value: unknown): value is AnchorOptions {
  if (!isPlainObject(value)) return false;
  const options = value as Record<string, unknown>;

  return (
    (options.fixationStrength === undefined || (typeof options.fixationStrength === "number" && Number.isFinite(options.fixationStrength) && options.fixationStrength >= 0 && options.fixationStrength <= 100))
    && (options.minimumWordLength === undefined || (typeof options.minimumWordLength === "number" && Number.isInteger(options.minimumWordLength) && options.minimumWordLength >= 1))
    && (options.cadence === undefined || options.cadence === "all" || options.cadence === "alternating" || options.cadence === "saccade")
    && isNonEmptyStringList(options.skipWords)
    && (options.shouldAnchorWord === undefined || typeof options.shouldAnchorWord === "function")
  );
}

/** Throws a `TypeError` when values from JavaScript or external config are invalid. */
export function assertValidAnchorOptions(options: unknown): asserts options is AnchorOptions {
  if (!isAnchorOptions(options)) {
    throw new TypeError("Invalid Anchor options: fixationStrength must be a finite number from 0 to 100, minimumWordLength must be a positive integer, cadence must be 'all', 'alternating', or 'saccade', skipWords must be an array of non-empty strings, and shouldAnchorWord must be a function.");
  }
}

/** Normalise public options once so all entry points behave consistently. */
export function resolveOptions(options: AnchorOptions = {}): ResolvedAnchorOptions {
  assertValidAnchorOptions(options);
  return {
    fixationStrength: options.fixationStrength ?? DEFAULT_STRENGTH,
    minimumWordLength: options.minimumWordLength ?? DEFAULT_MINIMUM_WORD_LENGTH,
    cadence: options.cadence ?? DEFAULT_CADENCE,
    skipWords: new Set((options.skipWords ?? []).map(normalizeWord)),
    shouldAnchorWord: options.shouldAnchorWord
  };
}

/**
 * Calculates the visual fixation point for one word without creating markup.
 * A zero-length prefix means that the word should remain unstyled.
 */
export function getWordParts(word: string, options: AnchorOptions = {}): WordParts {
  const resolved = resolveOptions(options);
  return getWordPartsWithResolvedOptions(word, resolved, 0);
}

function getWordPartsWithResolvedOptions(word: string, options: ResolvedAnchorOptions, index: number): WordParts {
  const characters = Array.from(word);
  const normalizedWord = normalizeWord(word);

  if (
    characters.length < options.minimumWordLength ||
    options.fixationStrength === 0 ||
    (options.cadence === "saccade" && SACCADE_STOP_WORDS.has(normalizedWord)) ||
    options.skipWords.has(normalizedWord) ||
    options.shouldAnchorWord?.({ word, normalizedWord, index }) === false
  ) {
    return { prefix: "", suffix: word };
  }

  const prefixLength = getPrefixLength(characters.length, options.fixationStrength);
  return {
    prefix: characters.slice(0, prefixLength).join(""),
    suffix: characters.slice(prefixLength).join("")
  };
}

/** Splits plain text into normal and bold display fragments while preserving it exactly. */
export function splitText(text: string, options: AnchorOptions = {}): TextSegment[] {
  const resolved = resolveOptions(options);
  const segments: TextSegment[] = [];
  let cursor = 0;
  let wordIndex = 0;

  for (const match of text.matchAll(WORD_PATTERN)) {
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ value: text.slice(cursor, index), bold: false });

    const rawWord = match[0];
    let parts: WordParts;

    if (resolved.cadence === "alternating" && wordIndex % 2 !== 0) {
      // In alternating mode, skip odd-indexed words to reduce visual density.
      parts = { prefix: "", suffix: rawWord };
    } else {
      parts = getWordPartsWithResolvedOptions(rawWord, resolved, wordIndex);
    }

    if (parts.prefix) segments.push({ value: parts.prefix, bold: true });
    if (parts.suffix) segments.push({ value: parts.suffix, bold: false });
    cursor = index + rawWord.length;
    wordIndex++;
  }

  if (cursor < text.length) segments.push({ value: text.slice(cursor), bold: false });
  return segments;
}

/**
 * Produces escaped HTML with presentational `<b>` fixation prefixes. This is
 * suitable for server-side rendering and other environments without a DOM.
 */
export function processText(text: string, options: AnchorOptions = {}): string {
  return splitText(text, options)
    .map(({ value, bold }) => {
      const escaped = escapeHtml(value);
      return bold ? `<b class="clamly-anchor-bold">${escaped}</b>` : escaped;
    })
    .join("");
}

/**
 * Computes quantitative reading metrics and cognitive speed estimation
 * for a passage of text under the specified Anchor options.
 */
export function calculateReadingMetrics(text: string, options: AnchorOptions = {}): ReadingMetrics {
  const segments = splitText(text, options);
  const words = Array.from(text.matchAll(WORD_PATTERN));
  const wordCount = words.length;
  const characterCount = text.length;

  let fixationCount = 0;
  for (const segment of segments) {
    if (segment.bold) fixationCount++;
  }

  const baselineWpm = 220;
  const standardReadingTimeSeconds = wordCount === 0 ? 0 : Math.max(1, Math.round((wordCount / baselineWpm) * 60));

  const fixationRatio = wordCount === 0 ? 0 : fixationCount / wordCount;
  // Saccadic facilitation estimated at up to ~22% efficiency gain
  const speedMultiplier = 1.0 + (fixationRatio * 0.22);
  const anchoredWpm = Math.round(baselineWpm * speedMultiplier);
  const anchoredReadingTimeSeconds = wordCount === 0 ? 0 : Math.max(1, Math.round((wordCount / anchoredWpm) * 60));
  const estimatedSecondsSaved = Math.max(0, standardReadingTimeSeconds - anchoredReadingTimeSeconds);
  const fixationDensityPercentage = wordCount === 0 ? 0 : Math.round((fixationCount / wordCount) * 100);

  return {
    wordCount,
    characterCount,
    fixationCount,
    estimatedWordsPerMinute: anchoredWpm,
    standardReadingTimeSeconds,
    anchoredReadingTimeSeconds,
    estimatedSecondsSaved,
    fixationDensityPercentage
  };
}

function getPrefixLength(length: number, strength: number): number {
  // Short words retain one visual point; longer words use the configurable
  // percentage, while always leaving at least one character as a suffix.
  if (length <= 3) return 1;
  return Math.min(length - 1, Math.max(1, Math.round((length * strength) / 100)));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyStringList(value: unknown): value is readonly string[] | undefined {
  return value === undefined || (Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0));
}

function normalizeWord(word: string): string {
  return word.toLowerCase();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character] ?? character);
}
