---
column: todo
labels: [frontend]
priority: high
agent: dev-opus
updatedAt: 2026-09-05T06:05:00.000Z
---
# Ship v2 for the remaining thirteen pages (after card 35)

Domain, Subdomain, Relationship, Team, Health, Entity, ValueObject, Service, Consumable, Schema, Policy, Invariant and Term pages switch to v2; the rest of v1 (templates, organisms, molecules, atoms, page.css rules only they used) is deleted; the `v2/` folder is promoted to the package's main `lib` layout.

## Checklist

- [ ] All routes render v2; v1 deleted; `v2/` promoted and imports repointed
- [ ] Pages unit at 100%; every e2e green; Storybook spec green over the renamed titles
- [ ] `npm run test:vscode` green; screenshots regenerated; docs updated

## Comments

- **lead** (2026-09-05T01:10:00.000Z): Approved by the human on 2026-09-05. Starts after card 35 lands.
- **lead** (2026-09-05T06:05:00.000Z): Assigned to dev-opus. Card 35 has landed; start from develop head. Fixed by decision: (1) all thirteen remaining routes render the v2 templates inside v2/PageLayout; `Page.svelte` loses its nested v1 `.layout` block. (2) Delete every v1 template, organism, molecule and atom, and every rule in assets/page.css and site.css that only they used; keep InteractiveDiagram, the flow folder, DisclosureCard, PatternHoverCard and the evidence derivations, moving any of them the v2 pages import into the v2 tree if that reads better. (3) Promote `v2/` to be the package's lib layout: `src/lib/v2/*` become `src/lib/{atoms,molecules,organisms,templates}` (or a flat `src/lib/ui/` if that is simpler; journal the choice), imports repointed, story titles lose the `V2/` prefix, `V2/Compare` stories and the `Compare`, `Strategic`, `Tactical` and `V1Tactical` harnesses are deleted since nothing remains to compare. (4) The app shell gets its own wrapper class for the tree column so `site.css` no longer selects a class the Sidebar owns. (5) Update `packages/pages/src/index.ts` exports, `apps/docs/docs/8-pages.md`, and every e2e; re-run `npm run test:vscode` and `npm run screenshots -w ods-vscode`; `assertDocSite` for the four models must stay green (doc generator is untouched). This is a `feat!:` change. Work in your worktree with absolute paths; build core, graphviz and pages and run `node scripts/codicons.mjs` before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
