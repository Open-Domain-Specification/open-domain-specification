---
column: review
labels: [infra]
priority: low
updatedAt: 2026-09-02T11:39:21.000Z
live: false
---
# Fix misspelled filenames

packages/core/src/consuption-graph.ts should be consumption-graph.ts and rennovate.json should be renovate.json (Renovate will not pick up the misspelled file).

## Checklist

- [x] Rename consuption-graph.ts and update imports in packages/core/src/context-map.ts:2
- [x] Rename rennovate.json

## Comments

- **claude** (2026-09-02T11:39:21.000Z): Renamed packages/core/src/consuption-graph.ts to consumption-graph.ts and updated the three importers at packages/core/src/index.ts:2, packages/core/src/context-map.ts:2 and packages/core/src/consumable-map.ts:2. Renamed rennovate.json to renovate.json so Renovate picks it up. Core typechecks and 39 tests pass. Small diff, inline self-scan clean.
