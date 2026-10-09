## What and why

Briefly describe the change and the problem it solves.

Fixes #(issue number)

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change (called out in the changeset)
- [ ] Documentation
- [ ] Refactoring or performance
- [ ] Tests or tooling

## Scope

- [ ] `@clamly/anchor` (packages/core)
- [ ] `@clamly/anchor-react`, `-vue` or `-svelte`
- [ ] `@clamly/rehype-anchor`
- [ ] Browser extension (apps/extension)
- [ ] Documentation site (apps/web)
- [ ] Repository, CI or tooling

## Checklist

- [ ] The change keeps the rules in [CONTRIBUTING.md](../CONTRIBUTING.md) (page nodes stay in place, no `<strong>`, deterministic text rules, nothing happens while disabled, no unsupported claims)
- [ ] Tests cover the change, and `pnpm lint`, `pnpm typecheck` and `pnpm test` pass
- [ ] DOM or rendering changes pass `pnpm test:e2e`
- [ ] Published packages changed: a changeset is included (`pnpm changeset`)
- [ ] Documentation is updated
