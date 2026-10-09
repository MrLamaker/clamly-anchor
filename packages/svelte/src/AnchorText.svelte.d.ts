import type { AnchorOptions } from "@clamly/anchor";
import type { Component } from "svelte";

export interface AnchorTextProps extends AnchorOptions {
  /** The text to anchor. */
  text: string;
}

/** Renders text with bold fixation prefixes as ordinary Svelte markup. */
declare const AnchorText: Component<AnchorTextProps>;
export default AnchorText;
