---
column: backlog
labels: [docs, bug]
priority: low
updatedAt: 2026-09-02T12:00:00.000Z
---
# Fix README quickstart variable mismatch

README.md:36 declares `workspace` but README.md:53 serialises `ws.toSchema()`, so the snippet does not run as written.

## Checklist

- [ ] Rename to a single variable in README.md
