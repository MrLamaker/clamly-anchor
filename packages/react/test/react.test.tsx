import { type ReactElement, StrictMode, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { Anchor, AnchorText, useAnchor } from "../src/index";

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 10));
const anchored = (root: ParentNode): string[] =>
  Array.from(root.querySelectorAll('[data-clamly-anchor="fixation"]'), (b) => b.textContent ?? "");
const B = (text: string): string => `<b class="clamly-anchor-bold" data-clamly-anchor="fixation">${text}</b>`;

afterEach(() => {
  document.body.replaceChildren();
});

describe("<AnchorText>", () => {
  it("renders anchored text on the server", () => {
    const html = renderToString(
      <p>
        <AnchorText>Reading dense material</AnchorText>
      </p>
    );
    expect(html).toBe(`<p>${B("Rea")}ding ${B("de")}nse ${B("mate")}rial</p>`);
  });

  it("passes options through", () => {
    expect(renderToString(<AnchorText cadence="alternating">one two three four</AnchorText>)).toBe(`${B("o")}ne two ${B("th")}ree four`);
  });

  it("hydrates without mismatches", async () => {
    const app = (
      <article>
        <h1>Title</h1>
        <p>
          <AnchorText cadence="saccade">The quick brown fox jumps over the lazy dog</AnchorText>
        </p>
      </article>
    );
    const container = document.createElement("div");
    container.innerHTML = renderToString(app);
    document.body.append(container);
    const errors: unknown[] = [];
    const root = hydrateRoot(container, app, { onRecoverableError: (error) => errors.push(error) });
    await settle();
    expect(errors).toEqual([]);
    expect(anchored(container)).toEqual(["qu", "br", "f", "ju", "la", "d"]);
    root.unmount();
  });
});

describe("<Anchor> and useAnchor", () => {
  it("anchors its children and follows React updates", async () => {
    let setLabel: (value: string) => void = () => undefined;
    function App(): ReactElement {
      const [label, set] = useState("loading results");
      setLabel = set;
      return (
        <Anchor as="section" renderer="dom" lazy={false} className="content" data-testid="anchor">
          <p>Status: {label}</p>
        </Anchor>
      );
    }
    const container = document.createElement("div");
    document.body.append(container);
    const errors: unknown[] = [];
    const root = createRoot(container, { onUncaughtError: (error) => errors.push(error), onCaughtError: (error) => errors.push(error) });
    flushSync(() =>
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      )
    );
    await settle();

    const section = container.querySelector("section")!;
    expect(section.className).toBe("content");
    expect(section.getAttribute("data-testid")).toBe("anchor");
    expect(section.hasAttribute("renderer")).toBe(false);
    expect(anchored(section)).toEqual(["Sta", "loa", "res"]);

    flushSync(() => setLabel("done"));
    await settle();
    expect(section.textContent).toBe("Status: done");
    expect(anchored(section)).toEqual(["Sta", "do"]);

    flushSync(() => root.unmount());
    expect(errors).toEqual([]);
  });

  it("updates options without recreating the controller", async () => {
    const controllers: unknown[] = [];
    function Probe({ strength }: { strength: number }): ReactElement {
      const ref = { current: null as HTMLDivElement | null };
      const stableRef = useState(() => ref)[0];
      const controller = useAnchor(stableRef, { renderer: "dom", lazy: false, fixationStrength: strength });
      if (controller && !controllers.includes(controller)) controllers.push(controller);
      return (
        <div
          ref={(node) => {
            stableRef.current = node;
          }}
        >
          <p>Original content</p>
        </div>
      );
    }
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    flushSync(() => root.render(<Probe strength={45} />));
    await settle();
    expect(anchored(container)).toEqual(["Orig", "con"]);

    flushSync(() => root.render(<Probe strength={80} />));
    await settle();
    expect(anchored(container)).toEqual(["Origin", "conten"]);
    expect(controllers).toHaveLength(1);
    flushSync(() => root.unmount());
    expect(container.innerHTML).toBe("");
  });
});
