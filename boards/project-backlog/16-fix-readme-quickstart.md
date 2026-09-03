---
column: done
labels: [docs, bug]
priority: low
updatedAt: 2026-09-03T13:20:00.000Z
live: false
---
# Fix README quickstart variable mismatch

README.md:36 declares `workspace` but README.md:53 serialises `ws.toSchema()`, so the snippet does not run as written.

## Checklist

- [x] Rename to a single variable in README.md

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T11:39:03.000Z): Renamed the serialisation call to use the declared workspace variable in README.md:53. One-line diff, inline clean-code self-scan found nothing.
