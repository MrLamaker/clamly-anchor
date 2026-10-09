/**
 * Scripts written without spaces between words. Bolding the start of a
 * "word" has no established reading benefit there, and finding word
 * boundaries needs a dictionary, so these scripts are skipped by default.
 */
export const NO_SPACE_SCRIPTS: readonly string[] = Object.freeze([
  "Han",
  "Hiragana",
  "Katakana",
  "Bopomofo",
  "Thai",
  "Lao",
  "Khmer",
  "Myanmar",
  "Tibetan",
  "Javanese",
  "Balinese"
]);

/**
 * Cursive scripts whose letters change shape when they join. Splitting a word
 * across a weight change can break that joining in some browsers, so markup
 * output skips them. The highlight renderer never splits words and keeps them.
 */
export const JOINING_SCRIPTS: readonly string[] = Object.freeze([
  "Arabic",
  "Syriac",
  "Nko",
  "Mongolian",
  "Adlam",
  "Mandaic",
  "Hanifi_Rohingya",
  "Manichaean",
  "Psalter_Pahlavi",
  "Sogdian",
  "Old_Uyghur",
  "Chorasmian"
]);

/** Scripts skipped by `splitText`, `processText` and the DOM renderer unless `skipScripts` is set. */
export const DEFAULT_SKIPPED_SCRIPTS: readonly string[] = Object.freeze([...NO_SPACE_SCRIPTS, ...JOINING_SCRIPTS]);

const patternCache = new Map<string, RegExp | null>();

/** Returns whether a name is a Unicode script that JavaScript regular expressions understand. */
export function isUnicodeScript(name: string): boolean {
  if (!/^[A-Za-z_]+$/.test(name)) return false;
  try {
    new RegExp(`\\p{Script=${name}}`, "u");
    return true;
  } catch {
    return false;
  }
}

/** Builds (and caches) a non-global pattern matching any character from the given scripts. */
export function scriptPattern(scripts: readonly string[]): RegExp | null {
  const key = scripts.join(",");
  const cached = patternCache.get(key);
  if (cached !== undefined) return cached;
  const pattern = scripts.length === 0 ? null : new RegExp(`[${scripts.map((script) => `\\p{Script=${script}}`).join("")}]`, "u");
  patternCache.set(key, pattern);
  return pattern;
}
