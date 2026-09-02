---
column: backlog
labels: [ddd, backend]
priority: med
updatedAt: 2026-09-02T12:00:00.000Z
---
# Add policies / process managers / sagas

Cross-aggregate reactions (when OrderPlaced then ReserveStock) cannot be expressed. Add a Policy building block that reacts to one or more events and issues commands. Depends on cards 03 and 04.

## Checklist

- [ ] Add PolicySchema with `on: eventRef[]` and `then: commandRef[]`
- [ ] Render policies as edges in a new flow map in graphviz
