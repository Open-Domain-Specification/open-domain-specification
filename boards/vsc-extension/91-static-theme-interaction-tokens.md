---
column: backlog
labels: [bug, frontend]
priority: med
agent: lead
live: false
updatedAt: 2026-09-05T16:29:12.068601+00:00
---
# Supply missing static-viewer interaction theme tokens

Baseline SHA: 6ec06edc0aa6b1db920a4c962170a8f8ac83e92d. Source-confirmed baseline issue from the accessibility reviewer, inspected by the lead. Case: DES-03 / A11Y-04.

Reproduction / verification path: Compare static viewer styles with tokens consumed by Ref, DataTable, PatternHover, Modal and Sidebar; then inspect computed keyboard-focus/hover states in a real browser.

Actual: Static styles do not provide focusBorder, contrastActiveBorder, list-hoverBackground, textLink-activeForeground and several hover/widget tokens used without fallback by promoted components. VS Code supplies them to its webview; exported/browser pages lack those host variables. Source-confirmed; no claim that UA fallback focus is invisible.

Expected: Supply the static light/dark fallback tokens required by the approved design language and verify focus/hover/selected states in real-browser and forced-colours modes.

Source: packages/pages/assets/site.css:6-50; packages/pages/src/lib/atoms/Ref.svelte:49. Full evidence/limits: docs/bots/design/ (deleted 2026-09-07)2026-09-05-the accessibility reviewer-baseline.md:1. Existing styling implementation cards13/28 were checked; this acceptance gap is not separately ticketed there.

## Checklist

- [ ] Reproduce and capture the computed/visual behaviour in an actual supported browser
- [ ] Implement the expected preference/theme behaviour with regression coverage
- [ ] Verify shared viewer, export and VS Code host where applicable

## Comments

- **lead** (2026-09-05T16:29:12.068601+00:00): Recorded source-confirmed gap at packages/pages/assets/site.css:6-50; packages/pages/src/lib/atoms/Ref.svelte:49; actual browser/assistive-technology evidence is still required. No production code changed.
