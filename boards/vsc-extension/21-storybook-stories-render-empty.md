---
column: backlog
labels: [bug, frontend]
priority: low
updatedAt: 2026-09-04T01:30:00.000Z
---
# Pre-existing Storybook stories render the bare component instead of their body

`addon-svelte-csf` treats plain children of `<Story>` as children of the meta component, not as a replacement for it. Card 19 found this while making the Storybook build work for the first time: `atoms-chip--tones` renders one empty chip instead of six and `atoms-markdown--prose` renders nothing. Wrap each affected story body in `{#snippet template()}` as the evidence stories now do, then widen `packages/pages/e2e/storybook.spec.ts` to every story so the whole Storybook is render-checked.

## Checklist

- [ ] Audit every `*.stories.svelte` under packages/pages/src/lib for bodies passed as children
- [ ] Convert to `template` snippets
- [ ] `e2e/storybook.spec.ts` covers all stories; green
