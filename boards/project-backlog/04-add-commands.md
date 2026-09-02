---
column: backlog
labels: [ddd, backend]
priority: high
updatedAt: 2026-09-02T12:00:00.000Z
---
# Add commands to aggregates

Nothing captures what causes state changes, so a command → aggregate → event flow (the output of event storming) cannot be expressed. Add a Command building block on aggregates with optional attributes and the events it may raise.

## Checklist

- [ ] Add CommandSchema and Aggregate.addCommand
- [ ] Link commands to the events they raise
- [ ] Optionally let an operation Consumable reference a command
- [ ] Render in doc and UI
