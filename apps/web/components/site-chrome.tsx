import Link from "next/link";

export const GITHUB_URL = "https://github.com/MrLamaker/clamly-anchor";
export const NPM_URL = "https://www.npmjs.com/package/@clamly/anchor";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand-lockup" aria-label="Clamly Anchor home">
        <span>clamly</span>
        <span className="brand-product">anchor</span>
      </Link>
      <nav aria-label="Main" className="site-nav">
        <Link href="/docs">Docs</Link>
        <Link href="/#playground">Playground</Link>
        <Link href="/self-test">Reading self-test</Link>
        <a href={GITHUB_URL} rel="noopener noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="project-footer">
      <div>
        <a href="https://clamly.app" className="brand-lockup footer-brand" aria-label="Clamly home">
          <span>clamly</span>
        </a>
        <p>Clamly Anchor is open source under the MIT license. It runs entirely in the browser and collects nothing.</p>
      </div>
      <nav aria-label="Footer" className="footer-links">
        <a href={GITHUB_URL} rel="noopener noreferrer">
          Source code
        </a>
        <a href={NPM_URL} rel="noopener noreferrer">
          npm
        </a>
        <a href={`${GITHUB_URL}/issues`} rel="noopener noreferrer">
          Report an issue
        </a>
        <a href={`${GITHUB_URL}/blob/main/SECURITY.md`} rel="noopener noreferrer">
          Security
        </a>
      </nav>
    </footer>
  );
}
