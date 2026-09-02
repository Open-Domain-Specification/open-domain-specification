---
column: review
labels: [ddd, backend]
priority: med
updatedAt: 2026-09-02T13:01:12.000Z
live: false
---
# Rethink service types: domain services, repositories, factories

ServiceType is application | domain | infrastructure (packages/core/src/schema.ts:110). Domain services in DDD sit inside a context alongside aggregates, not as a peer with provides/consumes, and infrastructure is an implementation concern that contradicts the README's problem-space positioning. Decide whether to drop infrastructure, and whether repositories and factories deserve first-class representation.

## Checklist

- [x] Record a decision on which tactical services ODS represents
- [x] Adjust ServiceType and docs accordingly

## Comments

- **claude** (2026-09-02T13:01:12.000Z): Recorded decisions/06-service-types.md: services are application or domain; infrastructure is an implementation concern and is dropped from ServiceType (packages/core/src/schema.ts:253-260); repositories and factories are deliberately not modelled. No usages existed in the example, tests or docs beyond the type itself; the docs hierarchy line is updated. Per the owner, no backwards compatibility. Build and tests green. Diff under the review skill's proportionality threshold; inline self-scan found nothing.
