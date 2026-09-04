---
column: backlog
labels: [frontend]
priority: high
updatedAt: 2026-09-05T00:40:00.000Z
---
# Ship v2 for the remaining thirteen pages (after card 35)

Domain, Subdomain, Relationship, Team, Health, Entity, ValueObject, Service, Consumable, Schema, Policy, Invariant and Term pages switch to v2; the rest of v1 (templates, organisms, molecules, atoms, page.css rules only they used) is deleted; the `v2/` folder is promoted to the package's main `lib` layout.

## Checklist

- [ ] All routes render v2; v1 deleted; `v2/` promoted and imports repointed
- [ ] Pages unit at 100%; every e2e green; Storybook spec green over the renamed titles
- [ ] `npm run test:vscode` green; screenshots regenerated; docs updated
