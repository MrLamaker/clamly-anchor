import { afterEach, describe, expect, it } from "vitest";
import { createApp, createSSRApp, defineComponent, h, nextTick, ref, withDirectives } from "vue";
import { renderToString } from "vue/server-renderer";
import { AnchorPlugin, AnchorText, useAnchor, vAnchor } from "../src/index";

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 10));
const anchored = (root: ParentNode): string[] =>
  Array.from(root.querySelectorAll('[data-clamly-anchor="fixation"]'), (b) => b.textContent ?? "");
const B = (text: string): string => `<b class="clamly-anchor-bold" data-clamly-anchor="fixation">${text}</b>`;

afterEach(() => {
  document.body.replaceChildren();
});

describe("<AnchorText>", () => {
  it("renders anchored text on the server", async () => {
    const html = await renderToString(createSSRApp({ render: () => h("p", null, [h(AnchorText, { text: "Reading dense material" })]) }));
    expect(html).toBe(`<p><!--[-->${B("Rea")}ding ${B("de")}nse ${B("mate")}rial<!--]--></p>`);
  });

  it("passes options and keeps missing booleans at their defaults", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(AnchorText, { text: "In 2026 we read", cadence: "alternating" }) }));
    expect(html).toBe(`<!--[-->${B("I")}n 2026 ${B("w")}e read<!--]-->`);
  });

  it("hydrates without mismatches", async () => {
    const App = { render: () => h("article", null, [h("p", null, [h(AnchorText, { text: "the quick brown fox", cadence: "saccade" })])]) };
    const container = document.createElement("div");
    container.innerHTML = await renderToString(createSSRApp(App));
    document.body.append(container);
    const warnings: string[] = [];
    const app = createSSRApp(App);
    app.config.warnHandler = (message) => warnings.push(message);
    const originalError = console.error;
    console.error = (...args: unknown[]) => warnings.push(args.join(" "));
    try {
      app.mount(container);
    } finally {
      console.error = originalError;
    }
    expect(warnings).toEqual([]);
    expect(anchored(container)).toEqual(["qu", "br", "f"]);
    app.unmount();
  });
});

describe("v-anchor and useAnchor", () => {
  it("anchors content, follows reactive updates and cleans up on unmount", async () => {
    const label = ref("loading results");
    const options = ref({ renderer: "dom" as const, lazy: false });
    const App = defineComponent({
      render: () => withDirectives(h("section", null, [h("p", null, `Status: ${label.value}`)]), [[vAnchor, options.value]])
    });
    const container = document.createElement("div");
    document.body.append(container);
    const app = createApp(App);
    app.mount(container);
    await settle();
    expect(anchored(container)).toEqual(["Sta", "loa", "res"]);

    label.value = "done";
    await nextTick();
    await settle();
    expect(container.textContent).toBe("Status: done");
    expect(anchored(container)).toEqual(["Sta", "do"]);

    options.value = { renderer: "dom", lazy: false, cadence: "alternating" } as never;
    await nextTick();
    await settle();
    expect(anchored(container)).toEqual(["Sta"]);

    app.unmount();
    expect(container.innerHTML).toBe("");
  });

  it("provides a composable and a plugin", async () => {
    const strength = ref(45);
    const Probe = defineComponent({
      setup() {
        const element = ref<HTMLElement | null>(null);
        useAnchor(element, () => ({ renderer: "dom", lazy: false, fixationStrength: strength.value }));
        return () => h("div", { ref: element }, [h("p", null, "Original content")]);
      }
    });
    const container = document.createElement("div");
    document.body.append(container);
    const app = createApp(Probe).use(AnchorPlugin);
    expect(app.component("AnchorText")).toBe(AnchorText);
    expect(app.directive("anchor")).toBe(vAnchor);
    app.mount(container);
    await settle();
    expect(anchored(container)).toEqual(["Orig", "con"]);

    strength.value = 80;
    await nextTick();
    await settle();
    expect(anchored(container)).toEqual(["Origin", "conten"]);
    app.unmount();
  });
});
