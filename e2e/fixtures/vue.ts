import { useAnchor } from "@clamly/anchor-vue";
import { createApp, defineComponent, h, ref, watchEffect } from "vue";
import { rendererFromUrl } from "./shared";

const renderer = rendererFromUrl();

const App = defineComponent({
  setup() {
    const status = ref("loading results");
    const single = ref("Single text child");
    const items = ref(["Alpha", "Bravo", "Charlie"]);
    const show = ref(true);
    const root = ref<HTMLElement | null>(null);
    const controller = useAnchor(root, { renderer, lazy: false });

    watchEffect(() => {
      if (controller.value) window.fixtureReady = true;
    });

    return () => [
      h("section", { id: "app-root", ref: root }, [
        h("h1", "Framework fixture"),
        h("p", { id: "status" }, ["Status: ", status.value]),
        h("p", { id: "single" }, single.value),
        h(
          "ul",
          { id: "list" },
          items.value.map((item) => h("li", { key: item }, `${item} item`))
        ),
        show.value ? h("p", { id: "optional" }, "Optional paragraph text") : null
      ]),
      h("div", { class: "controls" }, [
        h(
          "button",
          {
            type: "button",
            id: "update",
            onClick: () => {
              status.value = "done reading now";
              single.value = "Updated single child";
            }
          },
          "Update"
        ),
        h("button", { type: "button", id: "reorder", onClick: () => (items.value = [...items.value].reverse()) }, "Reorder"),
        h("button", { type: "button", id: "remove", onClick: () => (show.value = false) }, "Remove"),
        h("button", { type: "button", id: "toggle", onClick: () => controller.value?.toggle() }, "Toggle")
      ])
    ];
  }
});

createApp(App).mount("#root");
