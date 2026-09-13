import { SACCADE_STOP_WORDS } from "./constants";
import type { AnchorOptions, ReadingCadence, ReadingMetrics, TextSegment, WordParts } from "./types";

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
}

/** Normalise public options once so all entry points behave consistently. */
export function resolveOptions(options: AnchorOptions = {}): ResolvedAnchorOptions {
  return {
    fixationStrength: clamp(options.fixationStrength ?? DEFAULT_STRENGTH, 0, 100),
    minimumWordLength: Math.max(1, Math.floor(options.minimumWordLength ?? DEFAULT_MINIMUM_WORD_LENGTH)),
    cadence: options.cadence ?? DEFAULT_CADENCE
  };
}

/**
 * Calculates the visual fixation point for one word without creating markup.
 * A zero-length prefix means that the word should remain unstyled.
 */
export function getWordParts(word: string, options: AnchorOptions = {}): WordParts {
  const resolved = resolveOptions(options);
  const characters = Array.from(word);

  if (
    characters.length < resolved.minimumWordLength ||
    resolved.fixationStrength === 0 ||
    (resolved.cadence === "saccade" && SACCADE_STOP_WORDS.has(word.toLowerCase()))
  ) {
    return { prefix: "", suffix: word };
  }

  const prefixLength = getPrefixLength(characters.length, resolved.fixationStrength);
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
      parts = getWordParts(rawWord, resolved);
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}
