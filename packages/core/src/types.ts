/**
 * Cadence strategy that controls which words receive a visual fixation anchor.
 * - 'all': Every eligible word receives an anchor.
 * - 'alternating': Every other word in a paragraph receives an anchor, reducing visual density.
 * - 'saccade': Leaves common function words (stop words) unanchored so content words stand out.
 */
export type ReadingCadence = "all" | "alternating" | "saccade";

/** Context supplied to a custom word-selection predicate. */
export interface WordAnchorContext {
  /** The exact word as it appears in the input. */
  word: string;
  /** The word in NFC form, lowercased for `locale`, useful for dictionary matching. */
  normalizedWord: string;
  /** Zero-based position among all words in the processed string or paragraph. */
  index: number;
}

/** Configuration shared by the text, markup and DOM APIs. */
export interface AnchorOptions {
  /**
   * Percentage of each eligible word used as its visual anchor, from 0 to 100.
   * Words of up to three characters always use one character. Defaults to 45.
   */
  fixationStrength?: number;

  /** Words with fewer user-perceived characters than this are left untouched. Defaults to 1. */
  minimumWordLength?: number;

  /** Reading rhythm. Defaults to 'all'. */
  cadence?: ReadingCadence;

  /** Words that must remain unanchored. Matching ignores case and Unicode normalization form. */
  skipWords?: readonly string[];

  /**
   * An additional word-selection policy. It runs for words that pass the
   * built-in checks; return `false` to leave the word unanchored.
   */
  shouldAnchorWord?: (context: WordAnchorContext) => boolean;

  /**
   * BCP 47 language tag, such as "en" or "de-CH". It selects the stop words
   * used by the 'saccade' cadence and the rules for case-insensitive matching.
   * The DOM APIs default to the nearest `lang` attribute.
   */
  locale?: string;

  /** Replaces the built-in stop words that the 'saccade' cadence leaves unanchored. */
  stopWords?: readonly string[];

  /** Anchor tokens that contain digits, such as "2026" or "H2O". Defaults to false. */
  anchorNumbers?: boolean;

  /**
   * Unicode script names, as used by `\p{Script=…}`, whose words stay untouched.
   * Defaults to scripts written without spaces between words (such as Han and Thai)
   * and, for markup output, cursive scripts whose letters must stay joined (such as Arabic).
   */
  skipScripts?: readonly string[];
}

/** Options for `calculateReadingMetrics`. */
export interface ReadingMetricsOptions extends AnchorOptions {
  /** Reading rate used for the time estimate. Defaults to 238 words per minute. */
  wordsPerMinute?: number;
}

/** Options that decide which parts of a page the DOM APIs process. */
export interface DomFilterOptions {
  /** Extra HTML tag names whose content is never processed. Matched case-insensitively. */
  skipTags?: readonly string[];

  /** Extra ARIA roles whose content is never processed. Matched case-insensitively. */
  skipRoles?: readonly string[];

  /** A CSS selector for elements whose content is never processed, such as ".price, .brand". */
  skipSelector?: string;

  /** Leave text that is already bold (font-weight 600 or more) untouched. Defaults to true. */
  skipBoldText?: boolean;
}

/** Details supplied after `processElement` anchors one text node. */
export interface ProcessedTextNode {
  /** Text of the node at the time it was anchored. */
  originalText: string;
  /** The page's own text node. Anchor keeps it in place and restores it exactly. */
  node: Text;
  /** The generated element that displays the anchored copy of the text. */
  wrapper: HTMLSpanElement;
  /** Number of fixation prefixes generated in this text node. */
  fixationCount: number;
}

/** Options available to the one-shot `processElement` API. */
export interface ProcessElementOptions extends AnchorOptions, DomFilterOptions {
  /** Called after an eligible text node has been anchored. */
  onNodeProcessed?: (node: ProcessedTextNode) => void;
}

/**
 * How anchors are drawn on a live page.
 * - 'highlight': the CSS Custom Highlight API. The page's DOM is never changed and text never reflows.
 * - 'dom': a generated `<b>` copy beside each text node, with the original kept in place.
 * - 'auto': 'highlight' when the browser supports it, otherwise 'dom'.
 */
export type AnchorRenderer = "auto" | "highlight" | "dom";

/** Options for `createAnchor`. */
export interface CreateAnchorOptions extends AnchorOptions, DomFilterOptions {
  /** How anchors are drawn. Defaults to 'auto'. */
  renderer?: AnchorRenderer;

  /** Keep anchors in sync when the page changes. Defaults to true. */
  observe?: boolean;

  /**
   * Anchor content as it approaches the viewport instead of all at once.
   * Requires IntersectionObserver; otherwise everything is processed in small chunks. Defaults to true.
   */
  lazy?: boolean;

  /** Start with anchors applied. Defaults to true. */
  enabled?: boolean;

  /** Add the default Anchor stylesheet to the document. Defaults to true. */
  styles?: boolean;

  /** Destroys the controller when the signal aborts. */
  signal?: AbortSignal;
}

/** A live Anchor instance returned by `createAnchor`. */
export interface AnchorController {
  /** Whether anchors are currently applied. */
  readonly enabled: boolean;
  /**
   * The renderer in use. 'none' means the highlight renderer was required
   * (`renderer: 'highlight'`) but the browser does not support it, so nothing is drawn.
   */
  readonly renderer: "highlight" | "dom" | "none";
  /** Applies anchors (again). */
  enable(): void;
  /** Removes every anchor and restores the page exactly, keeping the controller reusable. */
  disable(): void;
  /** Switches anchors on or off and returns the new state. */
  toggle(force?: boolean): boolean;
  /** Merges new options and re-renders. */
  update(options: Partial<CreateAnchorOptions>): void;
  /** Re-scans the root for content the observer could not see. */
  refresh(): void;
  /** Synchronously anchors all pending content, including content outside the viewport. */
  flush(): void;
  /** Disables the controller and releases every resource. It cannot be used again. */
  destroy(): void;
}

/** A word split into its visually bold prefix and unstyled suffix. */
export interface WordParts {
  prefix: string;
  suffix: string;
}

/** A text fragment emitted by `splitText`. */
export interface TextSegment {
  value: string;
  bold: boolean;
}

/** A fixation prefix inside a string, as UTF-16 offsets. */
export interface AnchorSpan {
  start: number;
  end: number;
}

/** Descriptive statistics for a passage. These are estimates, not measured reading speed. */
export interface ReadingMetrics {
  /** Number of words in the text. */
  wordCount: number;
  /** Number of user-perceived characters, including spaces and punctuation. */
  characterCount: number;
  /** Number of words that receive a fixation anchor under the given options. */
  fixationCount: number;
  /** Percentage of words that receive a fixation anchor (0-100). */
  fixationDensityPercentage: number;
  /** The reading rate used for `estimatedReadingTimeSeconds`. */
  wordsPerMinute: number;
  /** Estimated reading time at `wordsPerMinute`. */
  estimatedReadingTimeSeconds: number;
}
