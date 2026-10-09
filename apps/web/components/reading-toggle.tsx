"use client";

import { createAnchor } from "@clamly/anchor";
import { createAnchorToggle } from "@clamly/anchor/toggle";
import { useEffect } from "react";

/**
 * Lets visitors turn reading anchors on for this site, using the same toggle
 * that Anchor ships for other websites. Off until the reader chooses; the
 * choice is remembered in this browser.
 */
export function ReadingToggle() {
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return undefined;
    const controller = createAnchor(main, { enabled: false, cadence: "saccade" });
    const toggle = createAnchorToggle({ controller, storageKey: "clamly-anchor-docs" });
    return () => {
      toggle.destroy();
      controller.destroy();
    };
  }, []);
  return null;
}
