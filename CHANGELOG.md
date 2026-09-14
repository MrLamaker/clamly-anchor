# Changelog

All notable changes to `@clamly/anchor` are documented here.

## 0.2.0 - 2026-09-14

### Added

- `processText()` for safe, DOM-free HTML rendering.
- `skipWords` for case-insensitive, application-specific word dictionaries.
- `shouldAnchorWord()` with a typed word, normalized word, and index context.
- `skipTags`, `skipRoles`, and `onNodeProcessed` for DOM processing customization.
- `isAnchorOptions()`, `assertValidAnchorOptions()`, and `assertValidProcessElementOptions()` for runtime configuration validation.

### Changed

- Invalid anchor option values now throw `TypeError` rather than being silently clamped or rounded.

