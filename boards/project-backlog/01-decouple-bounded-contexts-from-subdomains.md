---
column: backlog
labels: [ddd, backend, breaking]
priority: high
updatedAt: 2026-09-02T12:00:00.000Z
---
# Decouple bounded contexts from subdomains

Subdomains are problem-space, bounded contexts are solution-space. The schema in packages/core/src/schema.ts:129-136 nests bounded contexts one-to-many under a subdomain, so a context serving several subdomains (or a subdomain served by several contexts) cannot be modelled. Make the relationship many-to-many. This is the most consequential DDD gap and a breaking schema change.

## Checklist

- [ ] Design the new schema shape (contexts owned by workspace or domain, linked to subdomains by ref)
- [ ] Update Workspace/Subdomain/BoundedContext classes in packages/core/src/workspace.ts
- [ ] Update ref helpers and lookups in packages/core/src/schema.ts
- [ ] Add a migration path in packages/core/src/workspace-from-schema.ts
- [ ] Update graphviz, doc, ods-ui and the petstore example
- [ ] Record a decision in decisions/
