---
column: backlog
labels: [ddd, backend, breaking]
priority: high
updatedAt: 2026-09-02T12:00:00.000Z
---
# Move core/supporting/generic classification onto subdomains

DDD classifies subdomains as core, supporting or generic. The schema puts `type: DomainType` on Domain (packages/core/src/schema.ts:60-72) and leaves Subdomain untyped. Move the classification to Subdomain, keeping Domain as a grouping.

## Checklist

- [ ] Add `type` to SubdomainSchema and Subdomain class
- [ ] Remove or deprecate `type` on Domain with a migration in workspace-from-schema.ts
- [ ] Update doc, graphviz and UI rendering of the type badge
- [ ] Update the petstore example
