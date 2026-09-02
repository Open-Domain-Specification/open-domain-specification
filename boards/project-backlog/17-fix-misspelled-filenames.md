---
column: backlog
labels: [infra]
priority: low
updatedAt: 2026-09-02T12:00:00.000Z
---
# Fix misspelled filenames

packages/core/src/consuption-graph.ts should be consumption-graph.ts and rennovate.json should be renovate.json (Renovate will not pick up the misspelled file).

## Checklist

- [ ] Rename consuption-graph.ts and update imports in packages/core/src/context-map.ts:2
- [ ] Rename rennovate.json
