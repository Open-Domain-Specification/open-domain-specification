---
column: review
labels: [ddd, backend]
priority: med
updatedAt: 2026-09-02T12:16:09.000Z
live: false
---
# Add team and ownership to bounded contexts

Context maps in practice show who owns each context (Conway's law). Add a Team concept at workspace level and an owner ref on BoundedContext, and show it in the context map and docs.

## Checklist

- [x] Add TeamSchema on Workspace and `team` ref on BoundedContext
- [x] Render owner on context map nodes and the bounded context page

## Comments

- **claude** (2026-09-02T12:16:09.000Z): TeamSchema on WorkspaceSchema.teams and a team ref on BoundedContextSchema (packages/core/src/schema.ts:14-22,150-160,240-244). Team class with derived boundedcontexts, Workspace.addTeam/getTeamByRef and BoundedContext.ownedBy (packages/core/src/workspace.ts:96-120,470-600,1230-1280); loader wires teams before contexts (packages/core/src/workspace-from-schema.ts:56-62). Context map nodes carry the team and graphviz prints it under the name (packages/graphviz/src/context-map.ts:41-58). UI badge on the context page; doc pages show Owned by and a Teams table on the workspace page via packages/doc/src/team.md.ts. Petstore has three teams. Build and 106 tests green, examples regenerated. Six-agent audit: nothing above 0.5; extracted the team link helper and exercised teamRef in tests.
