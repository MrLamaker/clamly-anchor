import "@clamly/anchor/styles.css";
import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import type { ReactNode } from "react";
import { ReadingToggle } from "../components/reading-toggle";
import { SiteFooter, SiteHeader } from "../components/site-chrome";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-clamly",
  display: "swap"
});

export const metadata: Metadata = {
  title: { default: "Clamly Anchor: reading anchors for any website", template: "%s | Clamly Anchor" },
  description:
    "Open-source reading anchors (bold word starts) for any website and framework. No DOM changes with the CSS Highlight API, safe with React, Vue and Svelte, server-rendered, many languages."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className={bricolage.variable}>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <div className="site-shell">
          <SiteHeader />
          <main id="content">{children}</main>
          <SiteFooter />
        </div>
        <ReadingToggle />
      </body>
    </html>
  );
}
