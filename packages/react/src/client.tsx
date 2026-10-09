"use client";

import { type AnchorController, type CreateAnchorOptions, createAnchor } from "@clamly/anchor";
import { createElement, type HTMLAttributes, type ReactElement, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";

const OPTION_KEYS = [
  "fixationStrength",
  "minimumWordLength",
  "cadence",
  "skipWords",
  "shouldAnchorWord",
  "locale",
  "stopWords",
  "anchorNumbers",
  "skipScripts",
  "skipTags",
  "skipRoles",
  "skipSelector",
  "skipBoldText",
  "renderer",
  "observe",
  "lazy",
  "enabled",
  "styles"
] as const satisfies ReadonlyArray<keyof CreateAnchorOptions>;

const OPTION_KEY_SET: ReadonlySet<string> = new Set<string>([...OPTION_KEYS, "signal"]);

/** Comparable values for every option: arrays become strings, functions compare by identity. */
function optionValues(options: CreateAnchorOptions): unknown[] {
  return OPTION_KEYS.map((key) => {
    const value = options[key];
    return Array.isArray(value) ? value.join("\u0000") : value;
  });
}

function sameValues(a: readonly unknown[], b: readonly unknown[]): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

/**
 * Anchors the content of an element and keeps the anchors in sync while React
 * renders. With the default 'auto' renderer, browsers that support the CSS
 * Custom Highlight API see no DOM changes at all; elsewhere Anchor keeps
 * React's own text nodes in place, so updates and unmounting keep working.
 * Returns the controller once it exists.
 */
export function useAnchor(ref: RefObject<Element | null>, options: CreateAnchorOptions = {}): AnchorController | null {
  const [controller, setController] = useState<AnchorController | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const applied = useRef<unknown[] | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const { signal: _signal, ...initial } = latest.current;
    const instance = createAnchor(element, initial);
    applied.current = optionValues(initial);
    setController(instance);
    return () => {
      instance.destroy();
      applied.current = null;
      setController(null);
    };
  }, [ref]);

  const values = optionValues(options);
  // biome-ignore lint/correctness/useExhaustiveDependencies: one dependency per option value, so an inline options object does not re-run the effect on every render.
  useEffect(() => {
    if (!controller || (applied.current !== null && sameValues(applied.current, values))) return;
    const { signal: _signal, ...next } = latest.current;
    controller.update(next);
    applied.current = values;
  }, [controller, ...values]);

  return controller;
}

type AnchorTag = "div" | "section" | "article" | "main" | "aside" | "header" | "footer" | "p" | "span" | "blockquote" | "li";

export type AnchorProps = Omit<CreateAnchorOptions, "signal"> &
  HTMLAttributes<HTMLElement> & {
    /** The element to render. Defaults to "div". */
    as?: AnchorTag;
    children?: ReactNode;
  };

/** An element that anchors everything rendered inside it. Props other than Anchor options go to the element. */
export function Anchor({ as = "div", ...props }: AnchorProps): ReactElement {
  const options: Record<string, unknown> = {};
  const elementProps: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (OPTION_KEY_SET.has(key)) options[key] = value;
    else elementProps[key] = value;
  }
  const ref = useRef<HTMLElement>(null);
  useAnchor(ref, options as CreateAnchorOptions);
  return createElement(as, { ...elementProps, ref });
}
