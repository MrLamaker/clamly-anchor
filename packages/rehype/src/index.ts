import {
  type AnchorOptions,
  BLOCK_TAGS,
  type PlanState,
  planAnchors,
  type ResolvedAnchorOptions,
  resolveOptions,
  SKIPPED_ROLES,
  SKIPPED_TAGS
} from "@clamly/anchor";
import type { Element, ElementContent, Parents, Root, RootContent, Text } from "hast";

export interface RehypeAnchorOptions extends AnchorOptions {
  /** Extra tag names whose content is never anchored. */
  skipTags?: readonly string[];
  /** Extra ARIA roles whose content is never anchored. */
  skipRoles?: readonly string[];
  /** Leave headings, `<b>`, `<strong>` and `<th>` alone, since they are already bold. Defaults to true. */
  skipBoldText?: boolean;
}

// SVG and MathML would not render HTML inside them.
const FOREIGN_TAGS = ["svg", "math"];
const BOLD_TAGS = ["h1", "h2", "h3", "h4", "h5", "h6", "b", "strong", "th"];

interface MdxJsxAttribute {
  type: string;
  name?: string;
  value?: unknown;
}

/**
 * A rehype plugin that adds fixation anchors to HTML at build time, for
 * Markdown, MDX and other unified pipelines. The result is plain markup: no
 * JavaScript runs in the browser, and `data-anchor="off"` on an ancestor (for
 * example `<html>`, set by `createAnchorToggle`) hides the anchors again.
 *
 *   unified().use(remarkParse).use(remarkRehype).use(rehypeAnchor, { cadence: "saccade" })
 */
export default function rehypeAnchor(options: RehypeAnchorOptions = {}): (tree: Root) => void {
  const { skipTags = [], skipRoles = [], skipBoldText = true, ...anchorOptions } = options;
  if (!isNameList(skipTags)) throw new TypeError("Invalid rehype-anchor options: skipTags must be an array of non-empty strings.");
  if (!isNameList(skipRoles)) throw new TypeError("Invalid rehype-anchor options: skipRoles must be an array of non-empty strings.");
  if (typeof skipBoldText !== "boolean") throw new TypeError("Invalid rehype-anchor options: skipBoldText must be a boolean.");
  resolveOptions(anchorOptions); // Reports invalid anchor options when the plugin is configured.

  const tags = new Set([
    ...Array.from(SKIPPED_TAGS, (tag) => tag.toLowerCase()),
    ...FOREIGN_TAGS,
    ...(skipBoldText ? BOLD_TAGS : []),
    ...skipTags.map((tag) => tag.toLowerCase())
  ]);
  const roles = new Set([...SKIPPED_ROLES, ...skipRoles.map((role) => role.toLowerCase())]);
  const resolved = new Map<string, ResolvedAnchorOptions>();

  const optionsFor = (lang: string | undefined): ResolvedAnchorOptions => {
    const key = anchorOptions.locale === undefined ? (lang ?? "") : "";
    let result = resolved.get(key);
    if (!result) {
      result = resolveOptions(anchorOptions, key ? { locale: key } : {});
      resolved.set(key, result);
    }
    return result;
  };

  const isSkipped = (element: Element): boolean => {
    if (tags.has(element.tagName.toLowerCase())) return true;
    const properties = element.properties;
    if (properties["dataClamlyAnchor"] !== undefined) return true; // Already anchored.
    const optOut = properties["dataAnchor"];
    if (optOut === "off" || optOut === "false") return true;
    if (properties["translate"] === "no") return true;
    if (properties["hidden"] !== undefined && properties["hidden"] !== false && properties["hidden"] !== "until-found") return true;
    const live = properties["ariaLive"];
    if (live === "polite" || live === "assertive") return true;
    // contenteditable is "booleanish": true, "", "true" and "plaintext-only" all make the element editable.
    const editable: unknown = properties["contentEditable"];
    if (editable !== undefined && editable !== null && editable !== false && String(editable).toLowerCase() !== "false") return true;
    const role = properties["role"];
    const roleText = Array.isArray(role) ? role.join(" ") : typeof role === "string" ? role : "";
    return roleText
      .toLowerCase()
      .split(/\s+/)
      .some((token) => roles.has(token));
  };

  const anchorText = (node: Text, lang: string | undefined, state: PlanState): ElementContent[] | null => {
    const { value } = node;
    if (value.trim() === "") return null;
    const spans = planAnchors(value, optionsFor(lang), state);
    if (spans.length === 0) return null;
    const result: ElementContent[] = [];
    let cursor = 0;
    for (const span of spans) {
      if (span.start > cursor) result.push({ type: "text", value: value.slice(cursor, span.start) });
      result.push({
        type: "element",
        tagName: "b",
        properties: { className: ["clamly-anchor-bold"], dataClamlyAnchor: "fixation" },
        children: [{ type: "text", value: value.slice(span.start, span.end) }]
      });
      cursor = span.end;
    }
    if (cursor < value.length) result.push({ type: "text", value: value.slice(cursor) });
    return result;
  };

  // A paragraph that already holds anchors (from processText, a component, or an
  // earlier run) is left alone: the text after each <b> is the rest of a word.
  const hasOwnAnchors = (parent: Parents): boolean =>
    (parent.children as Array<RootContent | ElementContent>).some(
      (child) =>
        child.type === "element" &&
        (child.properties["dataClamlyAnchor"] === "fixation" || (!BLOCK_TAGS.has(child.tagName) && hasOwnAnchors(child)))
    );

  const visit = (parent: Parents, lang: string | undefined, state: PlanState, skipText: boolean): void => {
    const children = parent.children as Array<RootContent | ElementContent>;
    for (let index = 0; index < children.length; index++) {
      const child = children[index];
      if (!child) continue;
      if (child.type === "text") {
        if (skipText) continue;
        const replacement = anchorText(child, lang, state);
        if (replacement) {
          children.splice(index, 1, ...replacement);
          index += replacement.length - 1;
        }
      } else if (child.type === "element") {
        if (isSkipped(child)) continue;
        const ownLang = child.properties["lang"];
        const childLang = typeof ownLang === "string" ? ownLang : lang;
        // Each paragraph-like element counts words from zero, so 'alternating' keeps its rhythm inside it.
        if (BLOCK_TAGS.has(child.tagName)) visit(child, childLang, { wordIndex: 0 }, hasOwnAnchors(child));
        else visit(child, childLang, state, skipText);
      } else if (isMdxJsxElement(child)) {
        if (child.attributes.some(isOptOutAttribute)) continue;
        const container = child as unknown as Parents;
        visit(container, lang, { wordIndex: 0 }, hasOwnAnchors(container));
      }
    }
  };

  return (tree: Root): void => {
    visit(tree, undefined, { wordIndex: 0 }, hasOwnAnchors(tree));
  };
}

export { rehypeAnchor };

function isNameList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

/** MDX components such as <Callout> keep their text children in a `children` array. */
function isMdxJsxElement(node: unknown): node is { type: string; attributes: MdxJsxAttribute[]; children: unknown[] } {
  if (typeof node !== "object" || node === null) return false;
  const candidate = node as { type?: unknown; attributes?: unknown; children?: unknown };
  return (
    (candidate.type === "mdxJsxFlowElement" || candidate.type === "mdxJsxTextElement") &&
    Array.isArray(candidate.attributes) &&
    Array.isArray(candidate.children)
  );
}

function isOptOutAttribute(attribute: MdxJsxAttribute): boolean {
  return (
    attribute.type === "mdxJsxAttribute" &&
    ((attribute.name === "data-anchor" && (attribute.value === "off" || attribute.value === "false")) ||
      (attribute.name === "translate" && attribute.value === "no"))
  );
}
