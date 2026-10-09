import { type AnchorOptions, type CreateAnchorOptions, createAnchor, splitText, type TextSegment } from "@clamly/anchor";
import type { Action } from "svelte/action";

export type { AnchorController, AnchorOptions, CreateAnchorOptions, ReadingCadence, TextSegment } from "@clamly/anchor";
export { type AnchorTextProps, default as AnchorText } from "./AnchorText.svelte";

/**
 * `use:anchor` anchors an element's content and keeps it in sync as Svelte
 * updates it. With the default 'auto' renderer, supporting browsers see no DOM
 * changes; elsewhere Svelte's own text nodes stay in place.
 *
 *   <article use:anchor={{ cadence: "saccade" }}>…</article>
 */
export const anchor: Action<Element, CreateAnchorOptions | undefined> = (node, options) => {
  const controller = createAnchor(node, options ?? {});
  return {
    update(next) {
      controller.update(next ?? {});
    },
    destroy() {
      controller.destroy();
    }
  };
};

/** Anchored segments for custom markup: `{#each anchorSegments(text) as part}`. */
export function anchorSegments(text: string, options: AnchorOptions = {}): TextSegment[] {
  return splitText(text, options);
}
