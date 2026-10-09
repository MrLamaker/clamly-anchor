# Security Policy

## Supported versions

Security fixes are released for the latest minor version of each package.

| Package | Supported |
| --- | --- |
| `@clamly/anchor` | 0.3.x |
| `@clamly/anchor-react`, `@clamly/anchor-vue`, `@clamly/anchor-svelte`, `@clamly/rehype-anchor` | 0.1.x |
| Browser extension | Latest store version |

## How Anchor handles data

Anchor runs entirely in the reader's browser. It does not collect, store or send any text, browsing history or analytics. The
browser extension stores only its own settings (in the browser's extension storage, synced by the browser if the user has sync
on), and runs on a page only while the user has switched it on for that site. The documentation site's reading self-test keeps
its results in the browser's local storage.

## Reporting a vulnerability

Please report vulnerabilities privately:

1. **Do not open a public GitHub issue.**
2. Email `security@clamly.app` with a description, the affected package or extension version, and steps to reproduce.
3. We acknowledge reports within 48 hours and will work with you on a fix before any public disclosure.

Thank you for helping keep Anchor and its users safe.
