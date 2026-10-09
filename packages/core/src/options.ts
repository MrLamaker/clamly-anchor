import { DEFAULT_SKIPPED_SCRIPTS, isUnicodeScript, NO_SPACE_SCRIPTS, scriptPattern } from "./scripts";
import { getStopWords } from "./stopwords";
import type { AnchorOptions, ReadingCadence, WordAnchorContext } from "./types";

const DEFAULT_STRENGTH = 45;
const DEFAULT_MINIMUM_WORD_LENGTH = 1;
const CADENCES: readonly string[] = ["all", "alternating", "saccade"];
const EMPTY_SET: ReadonlySet<string> = new Set<string>();

/** Options after validation and normalisation. The shape is internal and may change between releases. */
export interface ResolvedAnchorOptions {
  readonly fixationStrength: number;
  readonly minimumWordLength: number;
  readonly cadence: ReadingCadence;
  readonly skipWords: ReadonlySet<string>;
  readonly stopWords: ReadonlySet<string>;
  readonly shouldAnchorWord: ((context: WordAnchorContext) => boolean) | undefined;
  readonly locale: string | undefined;
  readonly anchorNumbers: boolean;
  /** Matches words that contain a character from a skipped script. */
  readonly skipScriptPattern: RegExp | null;
  /** Matches no-space scripts the caller opted into; their runs are split with Intl.Segmenter. */
  readonly segmentPattern: RegExp | null;
}

/** Context-dependent defaults, such as a renderer's script policy or a page's language. */
export interface ResolveDefaults {
  skipScripts?: readonly string[];
  locale?: string;
}

/** Lists every problem with a candidate options object. An empty list means it is valid. */
export function describeInvalidAnchorOptions(value: unknown): string[] {
  if (!isPlainObject(value)) return ["options must be a plain object"];
  const options = value as Record<string, unknown>;
  const problems: string[] = [];
  const { fixationStrength, minimumWordLength, cadence, skipWords, shouldAnchorWord, locale, stopWords, anchorNumbers, skipScripts } =
    options;

  if (
    fixationStrength !== undefined &&
    !(typeof fixationStrength === "number" && Number.isFinite(fixationStrength) && fixationStrength >= 0 && fixationStrength <= 100)
  ) {
    problems.push(`fixationStrength must be a number from 0 to 100 (received ${describe(fixationStrength)})`);
  }
  if (
    minimumWordLength !== undefined &&
    !(typeof minimumWordLength === "number" && Number.isInteger(minimumWordLength) && minimumWordLength >= 1)
  ) {
    problems.push(`minimumWordLength must be a whole number of at least 1 (received ${describe(minimumWordLength)})`);
  }
  if (cadence !== undefined && !(typeof cadence === "string" && CADENCES.includes(cadence))) {
    problems.push(`cadence must be "all", "alternating" or "saccade" (received ${describe(cadence)})`);
  }
  if (!isOptionalStringList(skipWords)) problems.push("skipWords must be an array of non-empty strings");
  if (!isOptionalStringList(stopWords)) problems.push("stopWords must be an array of non-empty strings");
  if (shouldAnchorWord !== undefined && typeof shouldAnchorWord !== "function") {
    problems.push(`shouldAnchorWord must be a function (received ${describe(shouldAnchorWord)})`);
  }
  if (locale !== undefined && !(typeof locale === "string" && canonicalLocale(locale) !== undefined)) {
    problems.push(`locale must be a valid BCP 47 language tag such as "en" or "de-CH" (received ${describe(locale)})`);
  }
  if (anchorNumbers !== undefined && typeof anchorNumbers !== "boolean") {
    problems.push(`anchorNumbers must be a boolean (received ${describe(anchorNumbers)})`);
  }
  if (skipScripts !== undefined) {
    if (!Array.isArray(skipScripts) || !skipScripts.every((script) => typeof script === "string")) {
      problems.push("skipScripts must be an array of Unicode script names");
    } else {
      const unknown = skipScripts.filter((script: string) => !isUnicodeScript(script));
      if (unknown.length > 0) problems.push(`skipScripts contains unknown Unicode scripts: ${unknown.join(", ")}`);
    }
  }
  return problems;
}

/** Returns whether an unknown value is a valid set of text-processing options. */
export function isAnchorOptions(value: unknown): value is AnchorOptions {
  return describeInvalidAnchorOptions(value).length === 0;
}

/** Throws a `TypeError` that names every invalid option. */
export function assertValidAnchorOptions(options: unknown): asserts options is AnchorOptions {
  const problems = describeInvalidAnchorOptions(options);
  if (problems.length > 0) throw new TypeError(`Invalid Anchor options: ${problems.join("; ")}.`);
}

/** Validates and normalises options once, so every entry point behaves the same way. */
export function resolveOptions(options: AnchorOptions = {}, defaults: ResolveDefaults = {}): ResolvedAnchorOptions {
  assertValidAnchorOptions(options);
  const locale = canonicalLocale(options.locale ?? defaults.locale);
  const cadence = options.cadence ?? "all";
  const skipScripts = options.skipScripts ?? defaults.skipScripts ?? DEFAULT_SKIPPED_SCRIPTS;

  return {
    fixationStrength: options.fixationStrength ?? DEFAULT_STRENGTH,
    minimumWordLength: options.minimumWordLength ?? DEFAULT_MINIMUM_WORD_LENGTH,
    cadence,
    skipWords: options.skipWords && options.skipWords.length > 0 ? normalizedSet(options.skipWords, locale) : EMPTY_SET,
    stopWords: cadence === "saccade" ? normalizedSet(options.stopWords ?? getStopWords(locale), locale) : EMPTY_SET,
    shouldAnchorWord: options.shouldAnchorWord,
    locale,
    anchorNumbers: options.anchorNumbers ?? false,
    skipScriptPattern: scriptPattern(skipScripts),
    segmentPattern: scriptPattern(NO_SPACE_SCRIPTS.filter((script) => !skipScripts.includes(script)))
  };
}

const CEDILLA_TO_COMMA: Readonly<Record<string, string>> = { Ş: "Ș", ş: "ș", Ţ: "Ț", ţ: "ț" };

/**
 * Normalises a word for dictionary matching: NFC form, typographic apostrophes
 * folded to ASCII, legacy Romanian cedilla letters mapped to comma-below, then
 * lowercased. Without a locale, lowercasing ignores the runtime's language so
 * results are identical on every server and browser.
 */
export function normalizeWord(word: string, locale?: string): string {
  const folded = word
    .normalize("NFC")
    .replace(/’/g, "'")
    .replace(/[ŞşŢţ]/g, (character) => CEDILLA_TO_COMMA[character] ?? character);
  return locale === undefined ? folded.toLowerCase() : folded.toLocaleLowerCase(locale);
}

/** Returns the canonical form of a BCP 47 tag, or undefined when it is missing or malformed. */
export function canonicalLocale(locale: string | undefined): string | undefined {
  if (!locale) return undefined;
  try {
    return Intl.getCanonicalLocales(locale)[0];
  } catch {
    return undefined;
  }
}

function normalizedSet(words: readonly string[], locale: string | undefined): ReadonlySet<string> {
  return new Set(words.map((word) => normalizeWord(word, locale)));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalStringList(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0));
}

/** A short, safe description of a received value for error messages. */
export function describe(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "function") return "a function";
  if (Array.isArray(value)) return "an array";
  if (value === null) return "null";
  if (typeof value === "object") return "an object";
  return String(value);
}
