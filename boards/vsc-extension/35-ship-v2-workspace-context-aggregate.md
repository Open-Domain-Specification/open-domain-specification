---
column: backlog
labels: [frontend]
priority: high
updatedAt: 2026-09-05T00:40:00.000Z
---
# Ship v2 for the workspace, context and aggregate pages (after human approval)

The first swap of v2 into the shipped routes, held until the human approves the design in the morning review. `Page.svelte` and `resolve.ts` render the v2 templates for `#`, `#/boundedcontexts/*` and aggregates; the v1 templates and any organism nothing imports afterwards are deleted; every e2e that reads those pages is updated; the real-VS-Code suite and the marketplace screenshots are re-run.

## Checklist

- [ ] WorkspacePage, ContextPage, AggregatePage routes render the v2 templates; v1 files deleted with their orphaned organisms and molecules
- [ ] Pages unit at 100%; every e2e green after selector updates; Storybook spec green
- [ ] `npm run test:vscode` green; `npm run screenshots -w ods-vscode` regenerated
- [ ] Docs page for pages updated
