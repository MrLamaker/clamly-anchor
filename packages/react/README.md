# @clamly/anchor-react

React components and a hook for [Clamly Anchor](https://github.com/MrLamaker/clamly-anchor) reading anchors. Works with React 18
and 19, including Server Components and streaming.

```bash
npm install @clamly/anchor-react
```

## `<AnchorText>`: anchored text, rendered anywhere

Uses no hooks, so it works in Server Components; its output is the same on the server and in every browser.

```tsx
import { AnchorText } from "@clamly/anchor-react";

export function Article({ body }: { body: string }) {
  return (
    <p>
      <AnchorText cadence="saccade">{body}</AnchorText>
    </p>
  );
}
```

## `<Anchor>`: anchor everything inside an element

Anchors whatever renders inside it and follows later updates. Anchor options are props; every other prop goes to the element.

```tsx
"use client";
import { Anchor } from "@clamly/anchor-react";

export function Reader({ children }: { children: React.ReactNode }) {
  return (
    <Anchor as="article" cadence="saccade" className="reader">
      {children}
    </Anchor>
  );
}
```

## `useAnchor(ref, options)`

Returns the controller once it exists, for example to build your own toggle:

```tsx
"use client";
import { useRef } from "react";
import { useAnchor } from "@clamly/anchor-react";

export function Post({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const anchor = useAnchor(ref, { enabled: false });
  return (
    <>
      <button type="button" onClick={() => anchor?.toggle()}>Reading anchors</button>
      <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
```

Changing options updates the existing controller; it is destroyed, and the DOM restored, on unmount.

## Safe with React's DOM

React keeps references to the text nodes it renders. Anchor never replaces or moves them: the highlight renderer does not touch the
DOM at all, and the DOM renderer leaves React's nodes in place and adds its own markup beside them. Updates, reordering, hydration
and unmounting keep working.

## Styles

Live anchoring adds its stylesheet automatically. For `<AnchorText>` markup, import it once (for example in your root layout):

```ts
import "@clamly/anchor/styles.css";
```

All options and the full API are documented in [`@clamly/anchor`](../core).

## License

MIT © [Clamly](https://clamly.app)
