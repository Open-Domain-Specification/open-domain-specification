---
column: review
labels: [infra]
priority: low
updatedAt: 2026-09-03T13:05:00.000Z
live: false
---
# Fix misspelled filenames

packages/core/src/consuption-graph.ts should be consumption-graph.ts and rennovate.json should be renovate.json (Renovate will not pick up the misspelled file).

## Checklist

- [x] Rename consuption-graph.ts and update imports in packages/core/src/context-map.ts:2
- [x] Rename rennovate.json

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T11:39:21.000Z): Renamed packages/core/src/consuption-graph.ts to consumption-graph.ts and updated the three importers at packages/core/src/index.ts:2, packages/core/src/context-map.ts:2 and packages/core/src/consumable-map.ts:2. Renamed rennovate.json to renovate.json so Renovate picks it up. Core typechecks and 39 tests pass. Small diff, inline self-scan clean.
