---
column: backlog
labels: [ddd, backend]
priority: med
updatedAt: 2026-09-02T12:00:00.000Z
---
# Rethink service types: domain services, repositories, factories

ServiceType is application | domain | infrastructure (packages/core/src/schema.ts:110). Domain services in DDD sit inside a context alongside aggregates, not as a peer with provides/consumes, and infrastructure is an implementation concern that contradicts the README's problem-space positioning. Decide whether to drop infrastructure, and whether repositories and factories deserve first-class representation.

## Checklist

- [ ] Record a decision on which tactical services ODS represents
- [ ] Adjust ServiceType and docs accordingly
