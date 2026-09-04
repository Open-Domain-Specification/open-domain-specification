---
column: todo
labels: [bug, frontend]
priority: low
agent: dev-sonnet
updatedAt: 2026-09-05T00:30:00.000Z
---
# Pre-existing Storybook stories render the bare component instead of their body

`addon-svelte-csf` treats plain children of `<Story>` as children of the meta component, not as a replacement for it. Card 19 found this while making the Storybook build work for the first time: `atoms-chip--tones` renders one empty chip instead of six and `atoms-markdown--prose` renders nothing. Wrap each affected story body in `{#snippet template()}` as the evidence stories now do, then widen `packages/pages/e2e/storybook.spec.ts` to every story so the whole Storybook is render-checked.

## Checklist

- [ ] Audit every `*.stories.svelte` under packages/pages/src/lib for bodies passed as children
- [ ] Convert to `template` snippets
- [ ] `e2e/storybook.spec.ts` covers all stories; green

## Comments

- **lead** (2026-09-05T00:30:00.000Z): Assigned to dev-sonnet. Fixed by decision: convert every story body to a `{#snippet template()}` (see any V2/ story for the pattern), then widen `e2e/storybook.spec.ts` to every story title and keep the existing content assertions; a story that renders only its bare meta component with empty args counts as a failure, so add a check that each story's root has text or an svg. Work in your worktree with absolute paths; build core, graphviz and pages and run `node scripts/codicons.mjs` before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
