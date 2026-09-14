/**
 * Cadence strategy that controls which words receive a visual fixation anchor.
 * - 'all': Every eligible word receives an anchor.
 * - 'alternating': Every other word receives an anchor, reducing visual density.
 * - 'saccade': Prioritizes content-rich words and skips common short stop words to guide natural eye movement.
 */
export type ReadingCadence = "all" | "alternating" | "saccade";

/** Context supplied to a custom word-selection predicate. */
export interface WordAnchorContext {
  /** The exact word as it appears in the input. */
  word: string;
  /** A lowercase form of `word`, useful for dictionary matching. */
  normalizedWord: string;
  /** Zero-based position among all words in the processed text node or string. */
  index: number;
}

/** Configuration shared by text and DOM processing APIs. */
export interface AnchorOptions {
  /**
   * Percentage of each eligible word used as its visual anchor. The default
   * of 45 produces the intended 40-50% fixation point for longer words.
   */
  fixationStrength?: number;

  /** Words shorter than this number of characters are left untouched. */
  minimumWordLength?: number;

  /**
   * Reading rhythm cadence. Defaults to 'all'.
   */
  cadence?: ReadingCadence;

  /**
   * Additional words that must remain unanchored. Matching is case-insensitive.
   */
  skipWords?: readonly string[];

  /**
   * An additional word-selection policy. It runs for words that pass the
   * built-in length, cadence, and dictionary checks; return `false` to skip.
   */
  shouldAnchorWord?: (context: WordAnchorContext) => boolean;
}

/** Details supplied after `processElement` transforms one text node. */
export interface ProcessedTextNode {
  /** Text before Clamly Anchor added any markup. */
  originalText: string;
  /** The generated wrapper that replaced the original text node. */
  wrapper: HTMLSpanElement;
  /** Number of fixation prefixes generated in this text node. */
  fixationCount: number;
}

/** Options available only to the DOM-based `processElement` API. */
export interface ProcessElementOptions extends AnchorOptions {
  /**
   * Additional HTML tag names whose descendants must not be processed.
   * Values are matched case-insensitively and are added to the safe defaults.
   */
  skipTags?: readonly string[];

  /**
   * Additional ARIA roles whose descendants must not be processed.
   * Values are matched case-insensitively and are added to the safe defaults.
   */
  skipRoles?: readonly string[];

  /** Called after an eligible text node has been transformed. */
  onNodeProcessed?: (node: ProcessedTextNode) => void;
}

/** A word split into its unstyled suffix and visually bold prefix. */
export interface WordParts {
  prefix: string;
  suffix: string;
}

/** A text fragment emitted by `splitText`. */
export interface TextSegment {
  value: string;
  bold: boolean;
}

/** Quantitative reading metrics and estimated reading time statistics. */
export interface ReadingMetrics {
  /** Total number of words identified in the text. */
  wordCount: number;
  /** Total character count including spaces and punctuation. */
  characterCount: number;
  /** Number of words that received visual fixation anchors. */
  fixationCount: number;
  /** Estimated baseline reading speed in words per minute (typically ~220 WPM). */
  estimatedWordsPerMinute: number;
  /** Estimated standard reading time in seconds. */
  standardReadingTimeSeconds: number;
  /** Estimated anchored reading time in seconds (accounting for saccadic facilitation). */
  anchoredReadingTimeSeconds: number;
  /** Estimated time saved in seconds. */
  estimatedSecondsSaved: number;
  /** Percentage of words that feature fixation anchors (0-100). */
  fixationDensityPercentage: number;
}
