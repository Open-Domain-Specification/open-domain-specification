---
column: done
labels: [ddd, backend, breaking]
priority: high
updatedAt: 2026-09-03T13:20:00.000Z
live: false
---
# Model context relationships explicitly instead of per-consumable patterns

Relationship patterns are split across ConsumablePattern and ConsumptionPattern (packages/core/src/schema.ts:25-58). customer-supplier appears on both sides, partnership and shared-kernel are symmetric context relationships rather than properties of one consumable, and separate-ways means no integration so it makes no sense on a consumption. Add an explicit BoundedContext-to-BoundedContext relationship carrying upstream/downstream direction and pattern; derive the context map in packages/core/src/context-map.ts from it.

## Checklist

- [x] Design ContextRelationshipSchema (upstream, downstream, pattern, optional symmetric flag)
- [x] Decide which patterns stay on consumables (OHS, PL) and which move to relationships
- [x] Rebuild ODSContextMap from relationships plus consumptions
- [x] ~~Migration~~ (dropped: no backwards compatibility required)
- [x] Record a decision in decisions/

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T12:08:56.000Z): Recorded decisions/03-explicit-context-relationships.md. Schema: UpstreamRole/DownstreamRole replace the old pattern unions, consumable and consumption patterns are optional roles, and WorkspaceSchema.relationships holds directed (upstream/downstream + roles) or symmetric (participants) relationships (packages/core/src/schema.ts:31-110,215). Model: ContextRelationship class with workspace.addRelationship plus DSL helpers upstreamOf/downstreamOf/partnerOf/sharesKernelWith/separateWaysFrom on BoundedContext (packages/core/src/workspace.ts:520-590,1100-1200); visitor gains visitContextRelationship. ODSContextMap rebuilt: every context in scope is a node, declared relationships are edges, and consumptions between undeclared pairs produce dashed implied upstream-downstream edges with merged roles (packages/core/src/context-map.ts:1-160). Graphviz draws direction only for directed types with a shared role label map (packages/graphviz/src/context-map.ts:41-75, role-labels.ts). UI gains ContextRelationshipTable on the four map pages; doc pages gain a Context Relationships table (packages/doc/src/context-relationships.md.ts). Petstore declares Sales customer-supplier of Catalog and Identity separate-ways from Sales. Per the owner no backwards compatibility: migrate.ts and the deprecated aliases from cards 01/02 were removed. Build and 103 tests green. Six-agent audit: nothing above 0.5; removed two unused members, reused isDirectedRelationshipType in graphviz, shared the label maps, renamed the options type.
