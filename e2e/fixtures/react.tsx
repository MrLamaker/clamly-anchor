import { useAnchor } from "@clamly/anchor-react";
import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { rendererFromUrl } from "./shared";

const renderer = rendererFromUrl();

function App() {
  const [status, setStatus] = useState("loading results");
  const [single, setSingle] = useState("Single text child");
  const [items, setItems] = useState(["Alpha", "Bravo", "Charlie"]);
  const [show, setShow] = useState(true);
  const ref = useRef<HTMLElement>(null);
  const controller = useAnchor(ref, { renderer, lazy: false });

  useEffect(() => {
    if (controller) window.fixtureReady = true;
  }, [controller]);

  return (
    <>
      <section id="app-root" ref={ref}>
        <h1>Framework fixture</h1>
        <p id="status">Status: {status}</p>
        <p id="single">{single}</p>
        <ul id="list">
          {items.map((item) => (
            <li key={item}>{item} item</li>
          ))}
        </ul>
        {show && <p id="optional">Optional paragraph text</p>}
      </section>
      <div className="controls">
        <button
          type="button"
          id="update"
          onClick={() => {
            setStatus("done reading now");
            setSingle("Updated single child");
          }}
        >
          Update
        </button>
        <button type="button" id="reorder" onClick={() => setItems((current) => [...current].reverse())}>
          Reorder
        </button>
        <button type="button" id="remove" onClick={() => setShow(false)}>
          Remove
        </button>
        <button type="button" id="toggle" onClick={() => controller?.toggle()}>
          Toggle
        </button>
      </div>
    </>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
