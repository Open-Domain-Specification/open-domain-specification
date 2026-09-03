---
column: done
labels: [bug, frontend]
priority: high
agent: antigravity
live: false
clean-code-swept: true
status: Reviewed and merged to develop
progress: 100
updatedAt: 2026-09-03T12:35:00.000Z
---
# Example URLs dynamically resolve to absolute URLs against current base URL

The viewer's import screen offers reference model examples built with relative paths (`./examples/${file}`). When an example card was selected or remembered, setting the relative path directly into `<input type="url">` caused browser constraint validation to block submission with "Please enter a URL" because `type="url"` requires an absolute URL with a scheme. Dynamically resolve relative URLs against `document.baseURI` so the input always displays and submits a correct absolute URL reflecting the origin the user is on (e.g. `https://open-ds.io/examples/streamline.json`), preserving `type="url"` validation.

## Checklist

- [x] Implement `toAbsoluteUrl` in `ImportScreen.svelte` resolving relative URLs against `document.baseURI`
- [x] Resolve example card URLs to absolute URLs dynamically on selection
- [x] Resolve remembered and query-parameter URLs to absolute URLs on initial state
- [x] Keep `type="url"` on the input and normalize input on change
- [x] Unit tests for dynamic resolution across example cards, remembered URLs, and change events
- [x] E2E test for relative URL form import resolved against base URL

## Comments

- **antigravity** (2026-09-03T12:22:00.000Z): Added `toAbsoluteUrl` in packages/pages/src/app/ImportScreen.svelte:15-22 to dynamically resolve relative paths against `document.baseURI`, keeping packages/pages/src/app/ImportScreen.svelte:74-84 as `type="url"`. In packages/pages/src/app/ImportScreen.svelte:24-28, initial URLs from query params or localStorage are resolved on mount; packages/pages/src/app/ImportScreen.svelte:61-64 resolves example URLs to absolute URLs when clicking example cards. Added unit tests in packages/pages/src/app/ImportScreen.test.ts:135-195 and 348-378, plus Playwright e2e test in packages/pages/e2e/viewer-import.spec.ts:37-49. Full unit test suite passes with 100% coverage across all 49 files and 365 tests. Ready for review.
- **claude** (2026-09-03T12:35:00.000Z): Review. The bug is real for the remembered and `?url=` paths: a relative path preloaded into `type="url"` fails constraint validation on Load, while an example card bypassed the form and worked. Resolving against `document.baseURI` at every entry point is the right fix and keeps the hosted origin out of the build (the examples list stays relative in dist). Checked: svelte-check and biome clean, 365 unit tests at 100% coverage, the 7 import e2e specs pass against the built bundle. One note, not blocking: the `onchange` normalisation turns a bare host like `example.com/x.json` into a same-origin path, but `type="url"` rejected that input before too. Approved and committed to develop.
