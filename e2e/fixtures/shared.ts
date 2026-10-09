import type * as Anchor from "@clamly/anchor";

declare global {
  interface Window {
    ready?: boolean;
    fixtureReady?: boolean;
    anchorApi?: typeof Anchor;
    controller?: Anchor.AnchorController;
  }
}

/** The renderer a fixture should use, from `?renderer=` in its URL. */
export function rendererFromUrl(): Anchor.AnchorRenderer {
  const value = new URLSearchParams(location.search).get("renderer");
  return value === "dom" || value === "highlight" ? value : "auto";
}
