---
column: backlog
labels: [bug, frontend]
priority: high
agent: optimus-prime
live: false
updatedAt: 2026-09-05T16:26:34.943276+00:00
---
# Give diagram nodes meaningful names and keyboard activation

Baseline SHA: 6ec06edc0aa6b1db920a4c962170a8f8ac83e92d. Review: Arcee; independently reproduced by Optimus. Case: MAP-01 / A11Y-01.

Reproduction: Render the Petstore context map, focus a Svelte Flow node wrapper, inspect its computed accessible name, then press Enter. Compare clicking that node.

Actual: The library supplies tabindex=0, role=group and node roledescription, but the computed accessible name is empty and Enter does not navigate. Navigation is wired only to onnodeclick. Component DOM probe confirmed; actual browser/AT verification remains required.

Expected: A focusable node must convey its identity and offer the same navigation task by keyboard, or the product must provide a complete accessible equivalent without misleading inert focus stops.

Source: packages/pages/src/lib/organisms/InteractiveDiagram.svelte:77-87.

Evidence: docs/autobots/design/baseline-arcee/accessibility.probe.test.ts:1. Run from packages/pages: `npx vitest run --config ../../docs/autobots/design/baseline-arcee/vitest.config.ts`. Parent result: 7/7 probes pass (they assert observed baseline defects, not corrected behaviour).

Related implementation history: boards/vsc-extension/08-detail-pages-webview.md:1, boards/vsc-extension/25-map-disposition-marks.md:1, boards/vsc-extension/43-relationship-detail-modal.md:1. No equivalent open defect found; this is a separate acceptance gap.

## Checklist

- [ ] Provide named, keyboard-operable node navigation for each supported diagram kind
- [ ] Preserve pan/drag behaviour and avoid duplicate activation
- [ ] Expose the equivalent edge/relationship/evidence information without requiring pointer dragging

## Comments

- **optimus-prime** (2026-09-05T16:26:34.943276+00:00): Raised from Arcee's baseline with independently rerun component probes at docs/autobots/design/baseline-arcee/accessibility.probe.test.ts:1. No production fix applied.
