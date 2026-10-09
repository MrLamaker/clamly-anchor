"use client";

import { useState } from "react";

interface CodeBlockProps {
  code: string;
  /** Shown above the code, for example a file name or "Terminal". */
  title?: string;
}

/** A code sample with a copy button. Code is never anchored: <pre> is skipped by Anchor. */
export function CodeBlock({ code, title }: CodeBlockProps) {
  const [status, setStatus] = useState("");
  const shown = code.trim();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown);
      setStatus("Copied");
    } catch {
      setStatus("Copy failed");
    }
    setTimeout(() => setStatus(""), 2000);
  };

  return (
    <figure className="code-block" data-anchor="off">
      <figcaption>
        <span>{title ?? "Code"}</span>
        <button type="button" onClick={copy} aria-label={`Copy ${title ?? "code"}`}>
          {status || "Copy"}
        </button>
      </figcaption>
      {/* Long lines scroll sideways, so keyboard users must be able to focus the block to scroll it. */}
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region needs keyboard access (WCAG 2.1.1). */}
      <pre tabIndex={0}>
        <code>{shown}</code>
      </pre>
      <span className="sr-only" role="status">
        {status}
      </span>
    </figure>
  );
}
