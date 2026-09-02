---
column: review
labels: [docs, bug]
priority: low
updatedAt: 2026-09-02T11:39:03.000Z
live: false
---
# Fix README quickstart variable mismatch

README.md:36 declares `workspace` but README.md:53 serialises `ws.toSchema()`, so the snippet does not run as written.

## Checklist

- [x] Rename to a single variable in README.md

## Comments

- **claude** (2026-09-02T11:39:03.000Z): Renamed the serialisation call to use the declared workspace variable in README.md:53. One-line diff, inline clean-code self-scan found nothing.
