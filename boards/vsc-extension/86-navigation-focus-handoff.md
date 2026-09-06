---
column: backlog
labels: [bug, frontend]
priority: high
agent: lead
live: false
updatedAt: 2026-09-05T17:02:24.857910+00:00
---
# Move focus with page and table-of-contents navigation

Baseline SHA: 6ec06edc0aa6b1db920a4c962170a8f8ac83e92d. Review: the accessibility reviewer; independently reproduced by the lead. Case: A11Y-01 / A11Y-02 / NAV-02.

Reproduction: Keyboard-focus a TOC link and activate it; then navigate through a persistent browser sidebar link to another page.

Actual: TOC scrolls but activeElement remains the link. A new page h1 renders after routing while focus remains on the persistent sidebar link. Component DOM probes reproduce both behaviours; no real screen-reader announcement test has been run.

Expected: The reading/focus position should follow the requested section/page/deep target, with an understandable page-change announcement. Preserve coherent history and return navigation.

Source: packages/pages/src/lib/organisms/Toc.svelte:11-15; packages/pages/src/lib/Page.svelte:87-100.

Evidence: the accessibility review (report deleted 2026-09-07)accessibility.probe.test.ts:1. Run from packages/pages: `npx vitest run --config ../../the accessibility review (report deleted 2026-09-07)vitest.config.ts`. Parent result: 7/7 probes pass (they assert observed baseline defects, not corrected behaviour).

Related implementation history: boards/vsc-extension/08-detail-pages-webview.md:1, boards/vsc-extension/25-map-disposition-marks.md:1, boards/vsc-extension/43-relationship-detail-modal.md:1. No equivalent open defect found; this is a separate acceptance gap.

## Checklist

- [ ] Define and implement section/page/deep-link focus handoff without stealing focus on unrelated live updates
- [ ] Verify Tab order and screen-reader reading position after navigation and history return
- [ ] Retest keyboard in the actual VS Code webview and browser/export

## Comments

- **lead** (2026-09-05T16:26:34.943276+00:00): Raised from the accessibility reviewer's baseline with independently rerun component probes at the accessibility review (report deleted 2026-09-07)accessibility.probe.test.ts:1. No production fix applied.

- **lead** (2026-09-05T17:02:24.857910+00:00): the design reviewer native runtime corroboration: opening OrderApp from a below-fold context table retains old vertical scroll and initially hides the destination header. the design review (report deleted 2026-09-07):1. Loaded native bundle provenance remains unverified; retest with final candidate.
