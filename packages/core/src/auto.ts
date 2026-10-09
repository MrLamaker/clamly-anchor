/**
 * Drop-in script for sites without a build step:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@clamly/anchor/dist/anchor.auto.global.js" defer></script>
 *
 * Optional data attributes on the script tag:
 *   data-target    CSS selector of the content to anchor (default: the whole page)
 *   data-strength  0-100; data-cadence all | alternating | saccade
 *   data-renderer  auto | highlight | dom; data-locale  BCP 47 tag
 *   data-toggle    "false" hides the reader's on/off button (anchors are then on)
 *   data-default   "on" starts with anchors on until the reader chooses
 *   data-label     button text; data-storage-key  where the choice is remembered
 */
import { createAnchor } from "./dom/controller";
import { type AnchorToggle, createAnchorToggle } from "./toggle";
import type { AnchorController, AnchorRenderer, CreateAnchorOptions, ReadingCadence } from "./types";

declare global {
  interface Window {
    clamlyAnchor?: { controller: AnchorController; toggle: AnchorToggle | null };
  }
}

const script = document.currentScript as HTMLScriptElement | null;
const data: DOMStringMap = script?.dataset ?? {};

function options(): CreateAnchorOptions {
  const result: CreateAnchorOptions = {};
  const strength = Number(data["strength"]);
  if (data["strength"] !== undefined && Number.isFinite(strength) && strength >= 0 && strength <= 100) result.fixationStrength = strength;
  if (data["cadence"] === "all" || data["cadence"] === "alternating" || data["cadence"] === "saccade")
    result.cadence = data["cadence"] as ReadingCadence;
  if (data["renderer"] === "auto" || data["renderer"] === "highlight" || data["renderer"] === "dom")
    result.renderer = data["renderer"] as AnchorRenderer;
  if (data["locale"]) {
    try {
      result.locale = Intl.getCanonicalLocales(data["locale"])[0];
    } catch {
      // Ignore malformed language tags.
    }
  }
  return result;
}

function start(): void {
  let target: Element | Document | null = document;
  if (data["target"]) {
    try {
      target = document.querySelector(data["target"]);
    } catch {
      target = null;
    }
  }
  if (!target) {
    console.warn(`Clamly Anchor: no element matches data-target "${data["target"] ?? ""}".`);
    return;
  }

  const withToggle = data["toggle"] !== "false";
  const controller = createAnchor(target, { ...options(), enabled: !withToggle });
  const toggle = withToggle
    ? createAnchorToggle({
        controller,
        defaultEnabled: data["default"] === "on",
        ...(data["label"] ? { label: data["label"] } : {}),
        ...(data["storageKey"] ? { storageKey: data["storageKey"] } : {})
      })
    : null;
  window.clamlyAnchor = { controller, toggle };
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
else start();
