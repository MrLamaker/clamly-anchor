import {
  type AnchorController,
  type AnchorOptions,
  type CreateAnchorOptions,
  createAnchor,
  type ReadingCadence,
  splitText,
  type WordAnchorContext
} from "@clamly/anchor";
import {
  type DefineComponent,
  type Directive,
  defineComponent,
  h,
  type MaybeRefOrGetter,
  onScopeDispose,
  type Plugin,
  type PropType,
  type ShallowRef,
  shallowRef,
  toValue,
  type VNode,
  watch
} from "vue";

export type { AnchorController, AnchorOptions, CreateAnchorOptions, ReadingCadence } from "@clamly/anchor";

export interface AnchorTextProps extends AnchorOptions {
  /** The text to anchor. */
  text: string;
}

const ANCHOR_OPTION_KEYS = [
  "fixationStrength",
  "minimumWordLength",
  "cadence",
  "skipWords",
  "shouldAnchorWord",
  "locale",
  "stopWords",
  "anchorNumbers",
  "skipScripts"
] as const satisfies ReadonlyArray<keyof AnchorOptions>;

/**
 * Renders text with bold fixation prefixes as ordinary Vue elements. The
 * output is identical on the server and in every browser, so hydration never
 * mismatches.
 */
export const AnchorText: DefineComponent<AnchorTextProps> = defineComponent({
  name: "AnchorText",
  props: {
    text: { type: String, required: true },
    fixationStrength: Number,
    minimumWordLength: Number,
    cadence: String as PropType<ReadingCadence>,
    skipWords: Array as PropType<readonly string[]>,
    shouldAnchorWord: Function as PropType<(context: WordAnchorContext) => boolean>,
    locale: String,
    stopWords: Array as PropType<readonly string[]>,
    // Without an explicit default Vue would turn a missing boolean into false.
    anchorNumbers: { type: Boolean, default: undefined },
    skipScripts: Array as PropType<readonly string[]>
  },
  setup(props) {
    return (): Array<VNode | string> => {
      const options: Record<string, unknown> = {};
      for (const key of ANCHOR_OPTION_KEYS) if (props[key] !== undefined) options[key] = props[key];
      return splitText(props.text, options as AnchorOptions).map((segment) =>
        segment.bold ? h("b", { class: "clamly-anchor-bold", "data-clamly-anchor": "fixation" }, segment.value) : segment.value
      );
    };
  }
}) as unknown as DefineComponent<AnchorTextProps>;

const controllers = new WeakMap<Element, AnchorController>();

function sameOptions(a: CreateAnchorOptions | null | undefined, b: CreateAnchorOptions | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof CreateAnchorOptions>;
  for (const key of keys) {
    const left = a[key];
    const right = b[key];
    if (Array.isArray(left) && Array.isArray(right) ? left.join("\u0000") !== right.join("\u0000") : !Object.is(left, right)) return false;
  }
  return true;
}

/**
 * `v-anchor` anchors the element's content and keeps it in sync as Vue
 * renders. With the default 'auto' renderer, supporting browsers see no DOM
 * changes; elsewhere Vue's own text nodes stay in place.
 */
export const vAnchor: Directive<Element, CreateAnchorOptions | undefined> = {
  mounted(element, binding) {
    controllers.set(element, createAnchor(element, binding.value ?? {}));
  },
  updated(element, binding) {
    if (!sameOptions(binding.value, binding.oldValue)) controllers.get(element)?.update(binding.value ?? {});
  },
  beforeUnmount(element) {
    controllers.get(element)?.destroy();
    controllers.delete(element);
  },
  getSSRProps() {
    return {};
  }
};

/** Anchors an element from a template ref; the controller is destroyed with the component. */
export function useAnchor(
  target: MaybeRefOrGetter<Element | null | undefined>,
  options: MaybeRefOrGetter<CreateAnchorOptions> = {}
): ShallowRef<AnchorController | null> {
  const controller = shallowRef<AnchorController | null>(null);
  watch(
    () => toValue(target),
    (element) => {
      controller.value?.destroy();
      controller.value = element ? createAnchor(element, toValue(options)) : null;
    },
    { immediate: true, flush: "post" }
  );
  watch(
    () => toValue(options),
    (next) => controller.value?.update(next),
    { deep: true }
  );
  onScopeDispose(() => {
    controller.value?.destroy();
    controller.value = null;
  });
  return controller;
}

/** Registers `<AnchorText>` and `v-anchor` globally: `app.use(AnchorPlugin)`. */
export const AnchorPlugin: Plugin = {
  install(app) {
    app.component("AnchorText", AnchorText);
    app.directive("anchor", vAnchor);
  }
};
