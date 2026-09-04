---
column: todo
labels: [frontend]
priority: high
agent: dev-opus
updatedAt: 2026-09-04T16:00:00.000Z
---
# v2 organisms in Storybook (design language v2, part 1 of 3)

The twelve organisms rebuilt on the v2 primitives, per docs/design/v2-specs/organism-*.md: PageHeader, Section, Toc, Sidebar, AttributesSection, InvariantsSection, LanguageSection, DiagramFigure, StrategicPositionTable, RelationshipDetail, HealthReport, and the page layout (template-page-layout.md) as `v2/PageLayout.svelte`. InteractiveDiagram is kept and wrapped, not rebuilt.

## Checklist

- [ ] `v2/organisms/`: the eleven organisms above plus `v2/PageLayout.svelte`, each with stories (light, dark, high contrast, density where rows are laid out) and tests at 100%
- [ ] A `V2/Layout/Context page shell` story composing PageLayout, Sidebar, PageHeader, Toc and one Section so the chrome can be judged as a whole
- [ ] `e2e/storybook.spec.ts` green over the new titles; pages unit suite at 100%

## Comments

- **lead** (2026-09-04T16:00:00.000Z): Assigned to dev-opus. Build the v2 versions as new files under `packages/pages/src/lib/v2/` (organisms under `v2/organisms/`, templates under `v2/templates/`), rendered only by `V2/...` Storybook stories against the petstore model. No shipped file changes; v1 stays as it is. Follow docs/design/design-language-v2.md and the matching spec in docs/design/v2-specs/ exactly; where a spec is silent, choose the denser, plainer option and journal it. Use only the v2 primitives (Keyword, Lockup, Ref, DefinitionList, DataTable, Heading, Comments, Disposition, EmptyState, HoverCard) plus InteractiveDiagram, which is kept as is. Every component: light, dark and high-contrast stories via `v2/Theme.harness.svelte`, a density story where rows are laid out, tests at 100% coverage, `{#snippet template()}` story bodies, and `e2e/storybook.spec.ts` green over the new titles. Work in your worktree with absolute paths for every suite; build core, graphviz and pages first (`npm run build -w packages/core -w packages/graphviz -w packages/pages`) and run `node scripts/codicons.mjs` in packages/pages before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first. Cards 30 and 31 build the templates on top of these organisms in parallel; keep the organisms' props close to the v1 ones so the template cards can start from the specs without waiting on you, and journal any prop you rename.
