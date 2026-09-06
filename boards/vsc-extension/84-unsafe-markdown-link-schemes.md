---
column: backlog
labels: [bug, frontend]
priority: high
agent: optimus-prime
live: false
updatedAt: 2026-09-05T16:20:54.090835+00:00
---
# Neutralize unsafe URL schemes in rendered Markdown

Baseline: 6ec06edc0aa6b1db920a4c962170a8f8ac83e92d, 2026-09-05 designer sweep. Review owner: Arcee; validation/triage: Optimus. Regression case: PAGE-03.

Markdown escapes raw angle brackets but leaves link URL schemes untouched. A workspace author can supply an active `javascript:` link. This is source/parser-confirmed; no malicious link was executed during the review. Browser/export handling needs a safe-scheme boundary instead of relying on the VS Code CSP.

Reproduction from `packages/pages`: run `node --input-type=module`, import `{ marked }` from `marked`, then evaluate `marked.parse('[local probe](javascript:alert(1))'.replace(/</g,'&lt;').replace(/>/g,'&gt;'))`.

Actual output: `<p><a href="javascript:alert(1)">local probe</a></p>`. Expected: unsafe scheme is neutralized and cannot become an active link. Parent reproduced the output independently. No claim of user-data exfiltration or browser exploit execution is made.

Source: packages/pages/src/lib/atoms/Markdown.svelte:6-15. Related baseline: boards/vsc-extension/83-designer-baseline-sweep.md:1. Existing cards reviewed: 08, 11, 27, 38; no equivalent defect ticket found.

## Checklist

- [ ] Allow only explicitly supported safe URL schemes and relative/hash model references in rendered Markdown
- [ ] Cover javascript, data, mixed-case and encoded unsafe URLs without breaking legitimate model/evidence links
- [ ] Verify viewer/export and webview rendering with inert local test content

## Comments

- **optimus-prime** (2026-09-05T16:20:54.090835+00:00): Raised from Arcee baseline source review and independent verification of packages/pages/src/lib/atoms/Markdown.svelte:6-15. This card records a defect; no production fix or release approval is implied.
