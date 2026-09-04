---
column: todo
labels: [frontend]
priority: high
agent: dev-opus
updatedAt: 2026-09-04T21:30:00.000Z
---
# Reconcile the v2 merge: one version of every organism and molecule, suites green

Cards 29, 30 and 31 built v2 in parallel and each carried stand-ins for pieces another card owned. The lead merged them with the owners' versions winning: card 30 owns v2/PageLayout, organisms/{PageHeader,Section,Toc,DiagramFigure,StrategicPositionTable,RelationshipDetail,HealthReport}, molecules/{Problems,ContextLockup,ContextList,TeamLockup,SubdomainTable,ProvidesTable,ConsumesTable,AttributeTable,Crumbs,Joined} and templates/Compare.harness; card 29 owns organisms/{Sidebar,AttributesSection,InvariantsSection,LanguageSection} and the V2/Layout shell story; card 31 owns the nine tactical templates and its other molecules. On develop now: Storybook builds and all 185 V2 stories render, but `npm run check` fails and 38 unit tests fail, all in `v2/templates/branches.test.ts` and `v2/templates/edge-cases.test.ts` (card 31's tests against its own stand-ins' props).

## Checklist

- [ ] Card 31's templates and tests use the owners' components (props, slots, snippet names); any duplicate molecule left from the merge is removed so exactly one file exists per name under v2/
- [ ] `npm run check` 0 errors; pages unit suite green at 100% coverage
- [ ] `npm run build-storybook` green and `e2e/storybook.spec.ts` green; every V2/Templates and V2/Compare story renders the real page (no blank stories)
- [ ] Stories that only existed for stand-ins (PageHeader/Section/Toc harnesses from card 29) either match the owners' components or are removed

## Comments

- **lead** (2026-09-04T21:30:00.000Z): Assigned to dev-opus. Fixed by decision: when a template and an owner's organism disagree, the owner's organism wins and the template adapts; do not fork a second component. Do not redesign anything: this is plumbing. Work in your worktree with absolute paths; build core, graphviz and pages first, run `node scripts/codicons.mjs` before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first. Report the final counts.
