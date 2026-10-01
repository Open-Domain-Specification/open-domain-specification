---
column: doing
labels: [model, bug]
priority: high
agent: lead
live: false
status: Correction passed on a2cef010 and both eighth-round reviewers confirmed it; final integrated signoff pending
progress: 95
clean-code-swept: true
updatedAt: 2026-10-01T04:15:00Z
---
# Context empty lists do not deny borrowed types

Issue #116. The seventh signoff round's OpenAI Astra low review reproduced a valid Cards context with no local value-object or schema declarations. Cards holds Ledger's Money and its operation carries Ledger's CardRequest over a shared kernel, yet the context page said every attribute was bare and no consumable carried a declared payload. The shared page serves the VS Code webview, static export and viewer.

## Checklist

- [x] Empty Value objects and Schemas lists say only that the context declares none locally
- [x] A zero-diagnostic borrowed Money/CardRequest fixture proves the copy before and after JSON round-trip
- [x] The lists still enumerate locally declared elements; borrowed uses remain visible on the holder or consumable page
- [x] Pinned model diagnostics and generated outputs are unchanged

## Gates

- [x] Focused ContextPage unit test and Svelte check
- [x] `bash scripts/verify-all.sh` passed on `a2cef010`: pages 1014, browser 430 passed/20 skipped, all model and generated checks green
- [ ] Exact-head final signoff after the gate

## Journal

- **lead** (2026-10-01): Issue #116 records the reader story. The lists are correctly local declarations; their old empty copy overclaimed what Cards can hold or carry. The replacement copy names local declarations, with a zero-diagnostic borrowed pair in the regression. No schema or validator rule changed.
- **lead** (2026-10-01): Clean-code pass: the declaration lists stay local; only their empty copy changes, and the test checks both valid borrowed uses before and after round-trip. No duplicate lookup or new branch was needed. Format and focused tests pass.
