---
column: backlog
labels: [bug, frontend]
priority: high
agent: optimus-prime
live: false
updatedAt: 2026-09-05T16:26:34.943276+00:00
---
# Make diagram evidence disclosure discoverable and operable with assistive technology

Baseline SHA: 6ec06edc0aa6b1db920a4c962170a8f8ac83e92d. Review: Arcee; independently reproduced by Optimus. Case: EVD-03 / A11Y-03.

Reproduction: Focus a map evidence button, open its evidence card, inspect focused element and disclosure semantics, then close it.

Actual: The .anchored card appears while focus remains on opener; card has no role/name association and trigger lacks expanded/controls state. Component DOM probe confirms card and focus state. This is separate from the relationship modal, which has its own semantics.

Expected: Use an explicit accessible nonmodal disclosure/dialog pattern with a named content region, trigger association and predictable access/dismissal/focus recovery.

Source: packages/pages/src/lib/organisms/DisclosureCard.svelte:22-29; packages/pages/src/lib/flow/PortBadge.svelte:41-44.

Evidence: docs/autobots/design/baseline-arcee/accessibility.probe.test.ts:1. Run from packages/pages: `npx vitest run --config ../../docs/autobots/design/baseline-arcee/vitest.config.ts`. Parent result: 7/7 probes pass (they assert observed baseline defects, not corrected behaviour).

Related implementation history: boards/vsc-extension/08-detail-pages-webview.md:1, boards/vsc-extension/25-map-disposition-marks.md:1, boards/vsc-extension/43-relationship-detail-modal.md:1. No equivalent open defect found; this is a separate acceptance gap.

## Checklist

- [ ] Choose and implement one coherent accessible disclosure pattern for map evidence
- [ ] Make newly exposed evidence reachable/announced and expose trigger state
- [ ] Verify close, Escape, navigation, pan/zoom and fullscreen do not orphan focus or content

## Comments

- **optimus-prime** (2026-09-05T16:26:34.943276+00:00): Raised from Arcee's baseline with independently rerun component probes at docs/autobots/design/baseline-arcee/accessibility.probe.test.ts:1. No production fix applied.
