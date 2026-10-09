import { describe, describeInvalidAnchorOptions } from "../options";
import type { CreateAnchorOptions, ProcessElementOptions } from "../types";

const RENDERERS: readonly string[] = ["auto", "highlight", "dom"];
const CONTROLLER_FLAGS = ["observe", "lazy", "enabled", "styles"] as const;

/** Lists every problem with DOM options. Selector validation needs a document. */
export function describeInvalidDomOptions(value: unknown, doc: Document | null, kind: "processElement" | "createAnchor"): string[] {
  const problems = describeInvalidAnchorOptions(value);
  if (typeof value !== "object" || value === null || Array.isArray(value)) return problems;
  const options = value as Record<string, unknown>;
  const { skipTags, skipRoles, skipSelector, skipBoldText } = options;

  if (!isOptionalNameList(skipTags)) problems.push("skipTags must be an array of non-empty strings");
  if (!isOptionalNameList(skipRoles)) problems.push("skipRoles must be an array of non-empty strings");
  if (skipSelector !== undefined && !(typeof skipSelector === "string" && isValidSelector(skipSelector, doc))) {
    problems.push(`skipSelector must be a valid CSS selector (received ${describe(skipSelector)})`);
  }
  if (skipBoldText !== undefined && typeof skipBoldText !== "boolean") {
    problems.push(`skipBoldText must be a boolean (received ${describe(skipBoldText)})`);
  }

  if (kind === "processElement") {
    if (options["onNodeProcessed"] !== undefined && typeof options["onNodeProcessed"] !== "function") {
      problems.push(`onNodeProcessed must be a function (received ${describe(options["onNodeProcessed"])})`);
    }
    return problems;
  }

  const renderer = options["renderer"];
  if (renderer !== undefined && !(typeof renderer === "string" && RENDERERS.includes(renderer))) {
    problems.push(`renderer must be "auto", "highlight" or "dom" (received ${describe(renderer)})`);
  }
  for (const flag of CONTROLLER_FLAGS) {
    if (options[flag] !== undefined && typeof options[flag] !== "boolean")
      problems.push(`${flag} must be a boolean (received ${describe(options[flag])})`);
  }
  const signal = options["signal"];
  if (signal !== undefined && !isAbortSignal(signal)) problems.push("signal must be an AbortSignal");
  return problems;
}

/** Throws a `TypeError` naming every invalid `processElement` option. */
export function assertValidProcessElementOptions(options: unknown): asserts options is ProcessElementOptions {
  const problems = describeInvalidDomOptions(options, globalThis.document ?? null, "processElement");
  if (problems.length > 0) throw new TypeError(`Invalid processElement options: ${problems.join("; ")}.`);
}

/** Throws a `TypeError` naming every invalid `createAnchor` option. */
export function assertValidCreateAnchorOptions(options: unknown, doc: Document | null): asserts options is CreateAnchorOptions {
  const problems = describeInvalidDomOptions(options, doc, "createAnchor");
  if (problems.length > 0) throw new TypeError(`Invalid createAnchor options: ${problems.join("; ")}.`);
}

function isOptionalNameList(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0));
}

function isValidSelector(selector: string, doc: Document | null): boolean {
  if (selector.trim() === "") return false;
  if (!doc) return true;
  try {
    doc.createDocumentFragment().querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

function isAbortSignal(value: unknown): value is AbortSignal {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as AbortSignal).aborted === "boolean" &&
    typeof (value as AbortSignal).addEventListener === "function"
  );
}
