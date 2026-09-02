---
column: backlog
labels: [ddd, backend]
priority: high
updatedAt: 2026-09-02T12:00:00.000Z
---
# Add a validation pass for DDD rules

There is no validation beyond ref resolution. An aggregate may have zero or many root entities, and provider/consumer pattern combinations are never checked for coherence. Add a `validate()` on Workspace returning structured diagnostics, and run it in the example and UI import.

## Checklist

- [ ] Rule: exactly one root entity per aggregate
- [ ] Rule: coherent consumable/consumption pattern pairs
- [ ] Rule: cross-aggregate references target roots
- [ ] Surface diagnostics in the UI import modal
