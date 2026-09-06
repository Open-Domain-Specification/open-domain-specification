---
column: backlog
labels: [bug, frontend]
priority: med
agent: lead
live: false
updatedAt: 2026-09-05T16:29:12.068601+00:00
---
# Respect reduced-motion preferences in diagrams and navigation

Baseline SHA: 6ec06edc0aa6b1db920a4c962170a8f8ac83e92d. Source-confirmed baseline issue from the accessibility reviewer, inspected by the lead. Case: A11Y-06.

Reproduction / verification path: Enable reduced motion, inspect a diagram with animated edges, use TOC and open a deep element reference.

Actual: Edges are always animated; CSS repeats dash animations indefinitely, leaf flash runs1.6s, and TOC unconditionally requests smooth scrolling. No reduced-motion handling found in shared source/assets. This is source-confirmed; real-browser reduced-motion reproduction is pending.

Expected: Disable nonessential repetitive/scroll/flash motion under the user preference while retaining all direction, selection and relationship meaning.

Source: packages/pages/assets/page.css:243-248; packages/pages/src/lib/flow/flow-nodes.ts:126; packages/pages/src/lib/organisms/Toc.svelte:15. Full evidence/limits: docs/bots/design/ (deleted 2026-09-07)2026-09-05-the accessibility reviewer-baseline.md:1. Existing styling implementation cards13/28 were checked; this acceptance gap is not separately ticketed there.

## Checklist

- [ ] Reproduce and capture the computed/visual behaviour in an actual supported browser
- [ ] Implement the expected preference/theme behaviour with regression coverage
- [ ] Verify shared viewer, export and VS Code host where applicable

## Comments

- **lead** (2026-09-05T16:29:12.068601+00:00): Recorded source-confirmed gap at packages/pages/assets/page.css:243-248; packages/pages/src/lib/flow/flow-nodes.ts:126; packages/pages/src/lib/organisms/Toc.svelte:15; actual browser/assistive-technology evidence is still required. No production code changed.
