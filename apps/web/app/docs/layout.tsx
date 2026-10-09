import type { ReactNode } from "react";
import { DocsNav } from "../../components/docs-nav";

export default function DocsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="docs-layout">
      <DocsNav />
      <article className="prose">{children}</article>
    </div>
  );
}
