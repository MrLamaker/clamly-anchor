# @clamly/anchor-vue

Vue 3 component, directive and composable for [Clamly Anchor](https://github.com/MrLamaker/clamly-anchor) reading anchors. Works
with Vue 3.3 and later, including server rendering and Nuxt.

```bash
npm install @clamly/anchor-vue
```

## Component and directive

```vue
<script setup lang="ts">
import { AnchorText, vAnchor } from "@clamly/anchor-vue";

defineProps<{ summary: string }>();
</script>

<template>
  <p><AnchorText :text="summary" cadence="saccade" /></p>

  <article v-anchor="{ cadence: 'saccade' }">
    <slot />
  </article>
</template>
```

`<AnchorText>` renders identical markup on the server and in the browser, so hydration never mismatches. `v-anchor` anchors
everything inside its element, follows Vue's updates, and runs only in the browser.

## Register globally

```ts
import { createApp } from "vue";
import { AnchorPlugin } from "@clamly/anchor-vue";

createApp(App).use(AnchorPlugin).mount("#app");
```

## `useAnchor(target, options)`

```ts
import { ref } from "vue";
import { useAnchor } from "@clamly/anchor-vue";

const article = ref<HTMLElement | null>(null);
const strength = ref(45);
const anchor = useAnchor(article, () => ({ fixationStrength: strength.value }));
// anchor.value?.toggle()
```

The controller follows option changes and is destroyed with the component.

## Styles

Live anchoring adds its stylesheet automatically. For `<AnchorText>`, import `@clamly/anchor/styles.css` once.

All options are documented in [`@clamly/anchor`](../core).

## License

MIT © [Clamly](https://clamly.app)
