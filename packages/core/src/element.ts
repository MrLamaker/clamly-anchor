import { createAnchor } from "./dom/controller";
import type { AnchorController, AnchorRenderer, CreateAnchorOptions, ReadingCadence } from "./types";

/** The `<clamly-anchor>` element: anchors the text inside it. */
export interface ClamlyAnchorElementInstance extends HTMLElement {
  /** The live controller while the element is on the page. */
  readonly controller: AnchorController | null;
}

declare global {
  interface HTMLElementTagNameMap {
    "clamly-anchor": ClamlyAnchorElementInstance;
  }
}

const ATTRIBUTES = ["strength", "cadence", "renderer", "locale", "skip-selector", "disabled"];
const CADENCES: readonly string[] = ["all", "alternating", "saccade"];
const RENDERERS: readonly string[] = ["auto", "highlight", "dom"];

/** Reads options from attributes. Invalid values are ignored, so a typo never breaks the page. */
function optionsFrom(element: HTMLElement): CreateAnchorOptions {
  const options: CreateAnchorOptions = { enabled: !element.hasAttribute("disabled") };
  const strength = Number(element.getAttribute("strength"));
  if (element.hasAttribute("strength") && Number.isFinite(strength) && strength >= 0 && strength <= 100)
    options.fixationStrength = strength;
  const cadence = element.getAttribute("cadence");
  if (cadence && CADENCES.includes(cadence)) options.cadence = cadence as ReadingCadence;
  const renderer = element.getAttribute("renderer");
  if (renderer && RENDERERS.includes(renderer)) options.renderer = renderer as AnchorRenderer;
  const locale = element.getAttribute("locale");
  if (locale) {
    try {
      options.locale = Intl.getCanonicalLocales(locale)[0];
    } catch {
      // Ignore malformed language tags.
    }
  }
  const skipSelector = element.getAttribute("skip-selector");
  if (skipSelector) {
    try {
      element.ownerDocument.createDocumentFragment().querySelector(skipSelector);
      options.skipSelector = skipSelector;
    } catch {
      // Ignore invalid selectors.
    }
  }
  return options;
}

function createElementClass(Base: typeof HTMLElement): new () => ClamlyAnchorElementInstance {
  return class ClamlyAnchorElement extends Base implements ClamlyAnchorElementInstance {
    static get observedAttributes(): string[] {
      return ATTRIBUTES;
    }

    #controller: AnchorController | null = null;

    get controller(): AnchorController | null {
      return this.#controller;
    }

    connectedCallback(): void {
      this.#controller ??= createAnchor(this, optionsFrom(this));
    }

    disconnectedCallback(): void {
      this.#controller?.destroy();
      this.#controller = null;
    }

    attributeChangedCallback(): void {
      this.#controller?.update(optionsFrom(this));
    }
  };
}

/** The element class, or undefined where custom elements do not exist (for example during SSR). */
export const ClamlyAnchorElement: (new () => ClamlyAnchorElementInstance) | undefined =
  typeof HTMLElement === "undefined" ? undefined : createElementClass(HTMLElement);

/** Registers the element under a tag name. Importing this module registers `<clamly-anchor>`. */
export function defineAnchorElement(name = "clamly-anchor"): void {
  if (typeof customElements === "undefined" || ClamlyAnchorElement === undefined) return;
  if (!customElements.get(name)) customElements.define(name, ClamlyAnchorElement);
}

defineAnchorElement();
