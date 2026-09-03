---
column: review
labels: [backend, breaking]
priority: med
updatedAt: 2026-09-03T13:05:00.000Z
live: false
---
# Use stable ids instead of name-based refs

Refs are string paths built from names (packages/core/src/schema.ts:160-200), so renaming any element breaks every ref to it. Consider stable ids with names as display labels, or at least a rename helper that rewrites refs.

## Checklist

- [x] Record a decision on id strategy
- [x] Implement with a migration in workspace-from-schema.ts

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T13:01:46.000Z): Recorded decisions/07-identity-strategy.md: the JSON key is the id, names are labels, explicit ids are the opt-in for rename safety, and opaque generated ids were rejected as unreadable. Most of the work landed earlier: card 01 shortened every context-owned ref so domain and subdomain names no longer appear in them, and its loader fix made JSON keys the ids on load (packages/core/src/workspace-from-schema.ts). This card documents the rules in apps/docs/docs/3-core/index.md (Identity and refs) and pins them with a rename test in packages/core/src/lookups.test.ts. The diagnostic the draft decision mentioned was dropped: it would need id-provenance tracking on every class. Per the owner, no migration. Small diff, inline self-scan clean.
