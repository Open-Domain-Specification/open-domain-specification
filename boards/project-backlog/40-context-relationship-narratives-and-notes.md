---
column: backlog
labels: [ddd, frontend, schema]
priority: med
updatedAt: 2026-09-03T15:33:00.000Z
---
# Context relationship narratives, role notes, and interactive UI popovers

When users inspect diagrams and bounded context detail pages, raw relationship abbreviations (OHS, ACL, C/S, SK) provide high cognitive friction. This card introduces natural language relationship sentence generation for bounded contexts, extends the schema with role-level notes (`{ role, notes }`), and adds interactive popovers in the UI that display both theoretical DDD pattern natures and model author implementation notes.

See proposal at [docs/rfcs/rfc-001-context-relationship-narratives-and-notes.md](../../docs/rfcs/rfc-001-context-relationship-narratives-and-notes.md).

## Checklist

- [ ] Core: Extend `UpstreamRole` and `DownstreamRole` in `packages/core/src/schema.ts` to support role objects with `notes`
- [ ] Core: Update `ContextRelationship` class and DSL helpers (`upstreamOf`, `downstreamOf`) in `packages/core/src/workspace.ts`
- [ ] Pages: Implement canonical `DDD_KNOWLEDGE_BASE` dictionary and narrative generator in `packages/pages`
- [ ] Pages: Implement `<InteractiveTerm />` and `<PatternPopover />` components
- [ ] Pages: Integrate narrative sentences into `ContextPage.svelte` under "Strategic position"
- [ ] Pages: Connect hover popovers to `PortBadge.svelte` and `ConsumableNode.svelte` (lollipops/sockets)
- [ ] Tests: Unit test all sentence permutations and ensure 100% coverage
- [ ] Root `npm test` green

## Comments

- **lead** (2026-09-03T15:33:00.000Z): Drafted RFC-001 proposal in docs/rfcs/rfc-001-context-relationship-narratives-and-notes.md after design review. Ready for team feedback.
