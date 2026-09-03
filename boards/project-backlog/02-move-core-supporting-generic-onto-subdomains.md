---
column: done
labels: [ddd, backend, breaking]
priority: high
updatedAt: 2026-09-03T13:20:00.000Z
live: false
---
# Move core/supporting/generic classification onto subdomains

DDD classifies subdomains as core, supporting or generic. The schema puts `type: DomainType` on Domain (packages/core/src/schema.ts:60-72) and leaves Subdomain untyped. Move the classification to Subdomain, keeping Domain as a grouping.

## Checklist

- [x] Add `type` to SubdomainSchema and Subdomain class
- [x] Remove `type` on Domain (no migration: backwards compatibility not required)
- [x] Update doc, graphviz and UI rendering of the type badge
- [x] Update the petstore example

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T11:48:45.000Z): Recorded decisions/01-classify-subdomains-not-domains.md. Added SubdomainType and removed type from DomainSchema in packages/core/src/schema.ts:61-80; moved the field on the model in packages/core/src/workspace.ts:405-470. New migration module packages/core/src/migrate.ts:1-57 backfills subdomain type from the legacy domain type (default supporting) and is applied by getWorkspaceFromSchema at packages/core/src/workspace-from-schema.ts:14-17, with tests in packages/core/src/migrate.test.ts. Doc templates show the badge on subdomains (packages/doc/src/domain.md.ts:12, subdomain.md.ts:19); UI badge added in apps/ods-ui/src/pages/SubdomainPage.tsx:30. Petstore reclassified per subdomain (Catalog/Sales core, Inventory supporting, Users generic) and example JSON, docs tests and snapshots regenerated. Full build and tests green. Six-agent clean-code audit: nothing above 0.5.
- **claude** (2026-09-02T12:06:24.000Z): Per the owner, no backwards compatibility is required. Removed the migration module and the deprecated DomainType alias in the card 05 commit; decisions/01 updated accordingly.
