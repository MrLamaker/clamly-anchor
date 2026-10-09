import { describe, resolveOptions } from "./options";
import { countWords, planAnchors } from "./text";
import type { ReadingMetrics, ReadingMetricsOptions } from "./types";

/**
 * Average silent reading rate for adult readers of non-fiction in English,
 * from Brysbaert (2019), "How many words do we read per minute? A review and
 * meta-analysis of reading rate", Journal of Memory and Language 109.
 */
export const DEFAULT_WORDS_PER_MINUTE = 238;

/**
 * Describes a passage: word count, how many words receive anchors, and an
 * estimated reading time at a given rate. Anchoring is not assumed to change
 * reading speed: published studies have not found that it does.
 */
export function calculateReadingMetrics(text: string, options: ReadingMetricsOptions = {}): ReadingMetrics {
  const { wordsPerMinute = DEFAULT_WORDS_PER_MINUTE, ...anchorOptions } = options;
  if (!(typeof wordsPerMinute === "number" && Number.isFinite(wordsPerMinute) && wordsPerMinute > 0)) {
    throw new TypeError(`Invalid Anchor options: wordsPerMinute must be a positive number (received ${describe(wordsPerMinute)}).`);
  }

  const resolved = resolveOptions(anchorOptions);
  const wordCount = countWords(text, resolved.locale);
  const fixationCount = planAnchors(text, resolved).length;

  return {
    wordCount,
    characterCount: countCharacters(text),
    fixationCount,
    fixationDensityPercentage: wordCount === 0 ? 0 : Math.round((fixationCount / wordCount) * 100),
    wordsPerMinute,
    estimatedReadingTimeSeconds: wordCount === 0 ? 0 : Math.max(1, Math.round((wordCount / wordsPerMinute) * 60))
  };
}

function countCharacters(text: string): number {
  if (typeof Intl.Segmenter !== "function") return Array.from(text).length;
  let count = 0;
  for (const _ of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)) count++;
  return count;
}
