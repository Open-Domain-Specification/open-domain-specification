---
column: done
labels: [docs, frontend]
priority: high
agent: claude
live: false
updatedAt: 2026-09-03T13:20:00.000Z
---
# Bring the docs site and UI help up to date with the new model

Cards 01 to 15 changed the model but only touched the apps where a card required it. The docs site has no pages for context relationships, teams, events, commands, policies, the flow map, the glossary or validation; the UI help modals still describe operations as aggregate verbs; and operations are not linked to the commands they expose.

## Checklist

- [x] Docs: strategic design page (subdomain classification, relationships, teams, big ball of mud) with an embedded example
- [x] Docs: tactical design page (attributes, events, commands, policies, invariants, cardinality, glossary) with an embedded example
- [x] Docs: validation page with an embedded example
- [x] Docs: flow map page in the graphviz section, visitor page lists the new visit methods
- [x] Docs: refresh feature lists on the graphviz, doc and UI pages
- [x] UI: rewrite ProvidesHelp, add help for commands, policies, glossary and context relationships
- [x] UI: link operations to the command they expose and event consumables to their event

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T13:14:06.000Z): Docs site: new pages apps/docs/docs/3-core/2-strategic-design.md, 3-tactical-design.md and 4-validation.md, and apps/docs/docs/4-graphviz/4-flow.md, each embedding a tested example from apps/docs/tests (strategic, tactical, validation, flow-map .example.test.ts) with inline snapshots; visitor.md lists every visit method; feature lists on the graphviz, doc and UI pages describe the new model, and the UI page documents the routes. UI: ProvidesHelp rewritten as the integration surface with roles (apps/ods-ui/src/modals/ProvidesHelp.tsx); new CommandsHelp, PoliciesHelp, GlossaryHelp and ContextRelationshipsHelp wired to their sections, PageSubtitle gained a rightSection for the last one; apps/ods-ui/src/components/ConsumableTargetBadge.tsx links operations to the command they expose and event consumables to their event on the aggregate and service pages. While writing the examples, Aggregate.publishes turned out to require a description in its options even though it defaults to the event's; fixed in packages/core/src/workspace.ts. Build, 131 package tests and 12 docs tests green; the docs app typechecks. Six-agent audit: nothing above 0.5; fixed the one doc contradiction about contexts needing a subdomain.
