---
column: review
labels: [ddd, backend]
priority: med
updatedAt: 2026-09-03T13:05:00.000Z
live: false
---
# Add policies / process managers / sagas

Cross-aggregate reactions (when OrderPlaced then ReserveStock) cannot be expressed. Add a Policy building block that reacts to one or more events and issues commands. Depends on cards 03 and 04.

## Checklist

- [x] Add PolicySchema with `on: eventRef[]` and `then: commandRef[]`
- [x] Render policies as edges in a new flow map in graphviz

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T12:44:23.000Z): Per decisions/04: PolicySchema with on (event refs) and then (command refs) on BoundedContextSchema.policies, plus policyRef (packages/core/src/schema.ts:150-165,250-260). Policy class with fluent on()/then(), BoundedContext.addPolicy, Workspace.getPolicyByRef over a policies() generator (packages/core/src/workspace.ts:350-370,540-560,1560-1630); loader links policies after all events and commands exist (packages/core/src/workspace-from-schema.ts:150-160,300-325). New ODSFlowMap walks from policies to the events they react to, the commands they issue and the events those raise (packages/core/src/flow-map.ts); graphviz flowMapToDigraph draws it left to right (packages/graphviz/src/flow-map.ts). Context page shows a flow map plus a Policies accordion; docs emit flowmap.svg and a Policies table. Petstore: Sales approves orders when the pet becomes available, Inventory recounts on any stock-affecting event. Build and 120 tests green. Six-agent audit: KISS flagged (0.5) that the map ingested every command in scope against its own docstring, now policy-driven; added the policies() generator DRY asked for.
