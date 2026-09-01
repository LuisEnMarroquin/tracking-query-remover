# Tracking Query Remover — Agent Guide

## Project overview

This repository contains a zero-build Manifest V3 browser extension. Its content script removes known tracking query parameters from the address bar while preserving parameters that control page behavior. It supports Chrome and Firefox and makes no network requests. It holds `activeTab` and `storage`, and the only thing it stores is the list of sites the user switched it off on, kept locally through `storage.local`.

Read [TRACKING-PARAMETER-RESEARCH.md](TRACKING-PARAMETER-RESEARCH.md) before changing parameter lists, matching behavior, exceptions, or the extension's privacy claims. That document records the source research and the reason behind the current design.

## Important behavior

- `content.js` is both the browser content script and the testable cleanup module.
- Global rules are only for names strongly associated with tracking.
- Ambiguous names such as `t`, `s`, `ref`, `tag`, `feature`, and `pp` must remain domain-scoped.
- Keep authentication and routing parameters such as `code`, `state`, `token`, `id`, `q`, `v`, `t`, `list`, `deep_link_value`, and redirect/deep-link destinations unless a narrowly scoped rule proves they are non-functional.
- Preserve email identifiers on unsubscribe, preference, subscription-management, and browser-view routes.
- Preserve fragments, duplicate non-tracking parameters, parameter order, and the raw encoding of values that remain.
- The extension cleans the visible URL after the initial request. Do not claim that it prevents the destination website from receiving parameters in that request.
- SPA URL changes must continue to be cleaned without continuous polling. The Navigation API covers Chrome, Edge, Firefox 147+, and Safari 26.2+; older browsers are handled by `popstate`, `hashchange`, and a short bounded burst of checks after a user interaction. Do not reintroduce a permanent timer or a document-wide `MutationObserver`.
- Extension pages run under `script-src 'self'`. Inline `<script>` in `popup.html` never executes, so popup logic has to stay in `popup.js`. Inline `<style>` is fine.
- Every entry point the manifest references must be added to the packaging list below, or the uploaded build breaks with no local error.

## Development workflow

Run these checks after changing behavior:

```sh
node --check content.js
node --test test/content.test.js
git diff --check
```

Add focused regression tests for every new rule family, exception, or bug fix. Include both a positive removal case and a false-positive case when a parameter name is ambiguous.

The current release candidate is version `1.2.0`. Do not bump the version merely because files changed; first confirm which version has actually been published in each store.

## Packaging

The Chrome Web Store ZIP must contain only these files at its root:

- `manifest.json`
- `content.js`
- `popup.html`
- `popup.js`
- `icon16.png`
- `icon48.png`
- `icon128.png`

Build it with:

```sh
zip -X -j dist/tracking-query-remover-<version>.zip manifest.json content.js popup.html popup.js icon16.png icon48.png icon128.png
unzip -t dist/tracking-query-remover-<version>.zip
```

ZIP artifacts are intentionally ignored by Git. Do not include tests, research documents, source artwork, private keys, or repository metadata in a store package.

## Change discipline

- Prefer official vendor documentation for new tracking parameters; use maintained privacy lists such as Brave or ClearURLs for corroboration and long-tail discovery.
- Never copy a large upstream rules database blindly. Review names for functional collisions and licensing implications.
- Avoid new extension permissions unless the requested feature cannot be implemented safely without them. Any permission change requires a privacy/store-review assessment.
- Keep the extension dependency-free and build-free unless the project owner explicitly chooses otherwise.
