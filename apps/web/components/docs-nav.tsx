"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_PAGES } from "../lib/docs-pages";

export function DocsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Documentation" className="docs-nav">
      <ul>
        {DOC_PAGES.map((page) => (
          <li key={page.href}>
            <Link href={page.href} aria-current={pathname === page.href ? "page" : undefined}>
              {page.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
