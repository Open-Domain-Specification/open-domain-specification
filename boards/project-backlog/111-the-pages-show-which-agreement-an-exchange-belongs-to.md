---
column: backlog
labels: [frontend]
priority: low
agent: developer
updatedAt: 2026-09-10T08:20:00.000Z
---
# The pages show which agreement an exchange belongs to

Card 107 let a consumption name its agreement, and the context map already draws one line per named agreement (card 103), but nothing shows which agreement a crossing belongs to: the consumable-map edge and the consumes tables on the aggregate, service and context pages do not show `relationship`. A reader of two named agreements between one pair cannot see from the pages which exchange runs under which.

## Checklist

- [ ] The consumes table on aggregate, service and bounded-context pages names the agreement where the consumption names one
- [ ] The consumable-map edge carries the agreement's name where the crossing names one
- [ ] Storybook story and a test for a pair with two named agreements; `bash scripts/verify-all.sh` green

## Comments
