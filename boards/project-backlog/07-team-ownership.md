---
column: backlog
labels: [ddd, backend]
priority: med
updatedAt: 2026-09-02T12:00:00.000Z
---
# Add team and ownership to bounded contexts

Context maps in practice show who owns each context (Conway's law). Add a Team concept at workspace level and an owner ref on BoundedContext, and show it in the context map and docs.

## Checklist

- [ ] Add TeamSchema on Workspace and `team` ref on BoundedContext
- [ ] Render owner on context map nodes and the bounded context page
