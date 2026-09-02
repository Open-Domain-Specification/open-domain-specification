---
column: todo
labels: [backend, ddd, breaking]
priority: high
updatedAt: 2026-09-02T14:30:00.000Z
live: false
---
# Modular workspaces: several files in .ods that reference each other

Today a workspace is one self-contained JSON file and every ref is local, of the form #/boundedcontexts/{id}/... resolved by getWorkspaceFromSchema in packages/core/src/workspace-from-schema.ts. The extension will host several workspace files in a .ods folder and they must be able to reference each other, so a context in one file can consume a consumable, join a relationship or serve a subdomain defined in another. This is a core model change that every downstream package feels. Write the decision record first, then implement; do not bolt cross-file refs onto the loader.

## Decided

See decisions/08-modular-workspaces.md: complete workspace per file, JSON Reference form for cross-file refs, only the strategic seam may cross, WorkspaceSet in core with two-phase loading and per-file dump, set-level validation, visitor, graphviz and doc over a set.

## Checklist

- [x] Decision record in decisions/08-modular-workspaces.md
- [ ] WorkspaceSet, two-phase loader, file-qualified refs in toSchema, set validation rules, with tests including a two-file round trip and a cycle between files
- [ ] Widened $ref pattern and descriptions in schema.ts, odsVersion minor bump
- [ ] visitWorkspaceSet on the visitor
- [ ] Second example file in packages/ods-example-ws consuming Petstore events
- [ ] Docs page in apps/docs/docs/3-core
- [ ] Graphviz maps over a set clustered by workspace; doc output one folder per workspace with cross links
