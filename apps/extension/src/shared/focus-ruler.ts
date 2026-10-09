export interface FocusRuler {
  show(): void;
  hide(): void;
}

const RULER_ID = "clamly-anchor-focus-ruler";
const HEIGHT = 36;

/**
 * A translucent band that follows the pointer to help keep your place in a
 * line of text. It ignores pointer events and is hidden from assistive technology.
 */
export function createFocusRuler(doc: Document): FocusRuler {
  let ruler: HTMLDivElement | null = null;
  const view = doc.defaultView;

  const move = (event: PointerEvent): void => {
    if (!ruler || !view) return;
    const top = Math.max(0, Math.min(view.innerHeight - HEIGHT, event.clientY - HEIGHT / 2));
    ruler.style.transform = `translateY(${top}px)`;
  };

  return {
    show(): void {
      if (ruler || !view) return;
      ruler = doc.createElement("div");
      ruler.id = RULER_ID;
      ruler.setAttribute("aria-hidden", "true");
      const reduceMotion = view.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      Object.assign(ruler.style, {
        position: "fixed",
        left: "0",
        right: "0",
        top: "0",
        height: `${HEIGHT}px`,
        transform: `translateY(${Math.round(view.innerHeight / 2 - HEIGHT / 2)}px)`,
        // A periwinkle band with darker edges stays visible on light and dark pages.
        background: "rgba(141, 162, 251, 0.18)",
        borderTop: "2px solid rgba(74, 92, 192, 0.6)",
        borderBottom: "2px solid rgba(74, 92, 192, 0.6)",
        pointerEvents: "none",
        zIndex: "2147483646",
        transition: reduceMotion ? "none" : "transform 70ms ease-out"
      });
      doc.documentElement.append(ruler);
      view.addEventListener("pointermove", move, { passive: true });
    },
    hide(): void {
      if (!ruler) return;
      view?.removeEventListener("pointermove", move);
      ruler.remove();
      ruler = null;
    }
  };
}
