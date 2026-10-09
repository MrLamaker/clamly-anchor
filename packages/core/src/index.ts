export {
  BLOCK_TAGS,
  GENERATED_ATTRIBUTE,
  HIGHLIGHT_NAME,
  OPT_OUT_ATTRIBUTE,
  SACCADE_STOP_WORDS,
  SKIPPED_ROLES,
  SKIPPED_TAGS
} from "./constants";
export { createAnchor, isHighlightSupported } from "./dom/controller";
export { assertValidCreateAnchorOptions } from "./dom/options";
export { assertValidProcessElementOptions, processElement, restoreElement } from "./dom/static";
export { ANCHOR_CSS } from "./dom/styles";
export { calculateReadingMetrics, DEFAULT_WORDS_PER_MINUTE } from "./metrics";
export type { ResolvedAnchorOptions } from "./options";
export { assertValidAnchorOptions, isAnchorOptions, normalizeWord, resolveOptions } from "./options";
export { DEFAULT_SKIPPED_SCRIPTS, JOINING_SCRIPTS, NO_SPACE_SCRIPTS } from "./scripts";
export { getStopWords, STOP_WORDS } from "./stopwords";
export type { PlanState } from "./text";
export { getAnchorSpans, getWordParts, graphemeClusters, planAnchors, processText, splitText } from "./text";
export type {
  AnchorController,
  AnchorOptions,
  AnchorRenderer,
  AnchorSpan,
  CreateAnchorOptions,
  DomFilterOptions,
  ProcessElementOptions,
  ProcessedTextNode,
  ReadingCadence,
  ReadingMetrics,
  ReadingMetricsOptions,
  TextSegment,
  WordAnchorContext,
  WordParts
} from "./types";
