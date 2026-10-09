import { type AnchorOptions, splitText } from "@clamly/anchor";
import type { ReactElement } from "react";

export interface AnchorTextProps extends AnchorOptions {
  /** The text to anchor. */
  children: string;
}

/**
 * Renders text with bold fixation prefixes as ordinary React elements. It uses
 * no hooks, so it works in Server Components, and its output is the same on
 * the server and in every browser, so hydration never mismatches.
 */
export function AnchorText({ children, ...options }: AnchorTextProps): ReactElement {
  const segments = splitText(typeof children === "string" ? children : String(children ?? ""), options);
  let offset = 0;
  const nodes = segments.map((segment) => {
    // A segment's position in the text is unique and stable, unlike its index after an edit.
    const start = offset;
    offset += segment.value.length;
    return segment.bold ? (
      <b key={start} className="clamly-anchor-bold" data-clamly-anchor="fixation">
        {segment.value}
      </b>
    ) : (
      segment.value
    );
  });
  return <>{nodes}</>;
}
