---
column: backlog
labels: [bug, frontend]
priority: med
agent: lead
live: false
updatedAt: 2026-09-05T16:26:34.943276+00:00
---
# Expose current page and distinguish browser navigation landmarks

Baseline SHA: 6ec06edc0aa6b1db920a4c962170a8f8ac83e92d. Review: the accessibility reviewer; independently reproduced by the lead. Case: A11Y-02 / NAV-01.

Reproduction: Open an exported/viewer page through the sidebar. Inspect the active item and navigate landmarks with an accessibility inspector.

Actual: The current sidebar page is styled active but lacks aria-current; navigation landmarks do not distinguish sidebar and breadcrumbs. Sidebar component DOM probe confirms no current-page marker; landmark observation is source-confirmed.

Expected: Assistive technology can identify the exact current page and distinguish site navigation from breadcrumbs without inferring visual CSS.

Source: packages/pages/src/lib/organisms/Sidebar.svelte:66-77; packages/pages/src/lib/molecules/Crumbs.svelte:13-15.

Evidence: the accessibility review (report deleted 2026-09-07)accessibility.probe.test.ts:1. Run from packages/pages: `npx vitest run --config ../../the accessibility review (report deleted 2026-09-07)vitest.config.ts`. Parent result: 7/7 probes pass (they assert observed baseline defects, not corrected behaviour).

Related implementation history: boards/vsc-extension/08-detail-pages-webview.md:1, boards/vsc-extension/25-map-disposition-marks.md:1, boards/vsc-extension/43-relationship-detail-modal.md:1. No equivalent open defect found; this is a separate acceptance gap.

## Checklist

- [ ] Apply aria-current to the exact current destination rather than every active ancestor
- [ ] Give navigation landmarks distinct accessible names
- [ ] Verify nested routes, breadcrumbs and current-state changes in browser/export

## Comments

- **lead** (2026-09-05T16:26:34.943276+00:00): Raised from the accessibility reviewer's baseline with independently rerun component probes at the accessibility review (report deleted 2026-09-07)accessibility.probe.test.ts:1. No production fix applied.
