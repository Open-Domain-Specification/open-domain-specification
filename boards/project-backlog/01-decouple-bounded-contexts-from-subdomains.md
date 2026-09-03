---
column: review
labels: [ddd, backend, breaking]
priority: high
updatedAt: 2026-09-03T13:05:00.000Z
live: false
---
# Decouple bounded contexts from subdomains

Subdomains are problem-space, bounded contexts are solution-space. The schema in packages/core/src/schema.ts:129-136 nests bounded contexts one-to-many under a subdomain, so a context serving several subdomains (or a subdomain served by several contexts) cannot be modelled. Make the relationship many-to-many. This is the most consequential DDD gap and a breaking schema change.

## Checklist

- [x] Design the new schema shape (contexts owned by workspace or domain, linked to subdomains by ref)
- [x] Update Workspace/Subdomain/BoundedContext classes in packages/core/src/workspace.ts
- [x] Update ref helpers and lookups in packages/core/src/schema.ts
- [x] ~~Add a migration path~~ (dropped: no backwards compatibility required)
- [x] Update graphviz, doc, ods-ui and the petstore example
- [x] Record a decision in decisions/

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T11:59:48.000Z): Recorded decisions/02-bounded-contexts-belong-to-the-workspace.md. Contexts now live on WorkspaceSchema.boundedcontexts and carry subdomains refs (packages/core/src/schema.ts:14-28,150-160); refs shorten to #/boundedcontexts/<id>/... (packages/core/src/schema.ts:186-260). Model: Workspace.addBoundedContext and BoundedContext.serves with a derived Subdomain.boundedcontexts view (packages/core/src/workspace.ts:78-92,415-470,480-560). Visitor dedupes contexts serving several subdomains and visits unserved ones (packages/core/src/visitor.ts:78-105). Loader rewritten into small passes and now honours JSON keys as ids, which was a latent bug (packages/core/src/workspace-from-schema.ts:1-210). Migration hoists nested contexts, suffixes id clashes and rewrites every legacy $ref (packages/core/src/migrate.ts:55-125) with tests in packages/core/src/migrate.test.ts. New packages/core/src/namespace.ts replaces the copy-pasted namespace chains in the three derived maps. Doc generator emits contexts once and lists them under every subdomain they serve (packages/doc/src/index.ts:30-110); UI routes are /boundedcontexts/:id (apps/ods-ui/src/App.tsx:29-40), context page shows served subdomains, navbar gets a group for unlinked contexts (apps/ods-ui/src/AppNavbar.tsx:17-64). Petstore Inventory BC now serves Catalog and Inventory. Full build and 106 tests green; docs snapshots and example JSON regenerated. Six-agent audit: navbar duplication at 0.5 and three sub-threshold items all fixed.
- **claude** (2026-09-02T12:06:24.000Z): Per the owner, no backwards compatibility is required. The hoisting migration was removed in the card 05 commit; decisions/02 updated. The loader still honours JSON keys as ids, which stands on its own merits.
