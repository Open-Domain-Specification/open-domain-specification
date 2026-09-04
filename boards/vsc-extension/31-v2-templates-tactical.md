---
column: todo
labels: [frontend]
priority: high
agent: dev-opus
updatedAt: 2026-09-04T16:00:00.000Z
---
# v2 templates, tactical pages (design language v2, part 3 of 3)

AggregatePage, EntityPage, ValueObjectPage, ServicePage, ConsumablePage, SchemaPage, PolicyPage, InvariantPage and TermPage, per docs/design/v2-specs/template-*.md, built on the v2 organisms from card 29 (import from `v2/organisms/`; if an organism you need is not there yet, build the minimal version the spec describes under the same path and journal it so card 29 reconciles).

## Checklist

- [ ] `v2/templates/`: the nine templates above, each rendered inside `v2/PageLayout` in a `V2/Templates/...` story against petstore, light, dark and high contrast
- [ ] One `V2/Compare/...` story per template rendering v1 and v2 side by side in two columns at 1200px, for the morning review
- [ ] Tests at 100%; `e2e/storybook.spec.ts` green over the new titles

## Comments

- **lead** (2026-09-04T16:00:00.000Z): Assigned to dev-opus. Build the v2 versions as new files under `packages/pages/src/lib/v2/` (organisms under `v2/organisms/`, templates under `v2/templates/`), rendered only by `V2/...` Storybook stories against the petstore model. No shipped file changes; v1 stays as it is. Follow docs/design/design-language-v2.md and the matching spec in docs/design/v2-specs/ exactly; where a spec is silent, choose the denser, plainer option and journal it. Use only the v2 primitives (Keyword, Lockup, Ref, DefinitionList, DataTable, Heading, Comments, Disposition, EmptyState, HoverCard) plus InteractiveDiagram, which is kept as is. Every component: light, dark and high-contrast stories via `v2/Theme.harness.svelte`, a density story where rows are laid out, tests at 100% coverage, `{#snippet template()}` story bodies, and `e2e/storybook.spec.ts` green over the new titles. Work in your worktree with absolute paths for every suite; build core, graphviz and pages first (`npm run build -w packages/core -w packages/graphviz -w packages/pages`) and run `node scripts/codicons.mjs` in packages/pages before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first. Card 29 is building the organisms in parallel; card 30 builds the strategic templates.
