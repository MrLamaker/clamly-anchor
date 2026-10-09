export interface PageStyle {
  show(): void;
  hide(): void;
}

/**
 * A stylesheet the extension adds to a page and can remove again. Where the
 * browser supports it, this is a constructed stylesheet, as in Anchor's own
 * engine: it adds nothing to the page's DOM, and a Content-Security-Policy
 * that blocks inline <style> elements cannot block it.
 */
export function createPageStyle(doc: Document, id: string, css: () => string): PageStyle {
  let sheet: CSSStyleSheet | null = null;
  let element: HTMLStyleElement | null = null;

  return {
    show(): void {
      if (sheet || element) return;
      const view = doc.defaultView;
      if (view && "adoptedStyleSheets" in doc && typeof view.CSSStyleSheet === "function") {
        try {
          const constructed = new view.CSSStyleSheet();
          constructed.replaceSync(css());
          doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, constructed];
          sheet = constructed;
          return;
        } catch {
          // Fall back to a <style> element below.
        }
      }
      element = doc.createElement("style");
      element.id = id;
      element.textContent = css();
      (doc.head ?? doc.documentElement).append(element);
    },
    hide(): void {
      if (sheet) {
        const own = sheet;
        doc.adoptedStyleSheets = doc.adoptedStyleSheets.filter((candidate) => candidate !== own);
        sheet = null;
      }
      element?.remove();
      element = null;
    }
  };
}
