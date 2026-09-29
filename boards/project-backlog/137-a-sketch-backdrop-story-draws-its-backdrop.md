---
column: doing
labels: [bug, frontend, testing]
priority: medium
agent: developer
live: true
updatedAt: 2026-09-29T14:10:00.000Z
---
# A sketch backdrop story draws its backdrop, and the Storybook check refuses a canvas that painted nothing

Issue 41, a child of epic 60. All four `Flow/SketchBackdrop` stories painted nothing: the blob, boundaries and domain-border paths each carried an empty `d`, no nodes were rendered, and the root's only text was the diagram library's attribution. `packages/pages/e2e/storybook.spec.ts` counted text length plus SVG-element count, so the attribution and an empty `<svg>` satisfied it and any future blank story could too. The designer reviewing the sketch style needs the curve behaviour those stories exist to show, and the check needs to fail a story that paints no real content. Card `boards/vsc-extension/21-storybook-stories-render-empty.md` is the earlier card whose claim (every story renders its own component) did not hold for these four; it is the same defect and is already held back against this issue.

## Checklist

- [x] Reproduce: the four stories fail a focused geometry assertion (nodes on the canvas, non-empty measured backdrop paths) against the unfixed build
- [x] Find the cause and fix it in the stories, not the component
- [x] The generic Storybook check counts readable text (library attribution excluded), SVG shapes the browser measures as non-empty, and flow nodes, instead of text length plus SVG-element count
- [x] The predicate is proved against DOM shaped like a blank story (attribution, empty `d`, zero-size shapes) and scores nothing
- [x] Every other story still passes the strengthened check unchanged

## Gates

- [ ] `npx @biomejs/biome check` clean on the touched files
- [ ] `bash scripts/verify-all.sh` green

## Comments

- **developer** (2026-09-29T14:10:00.000Z): Reproduced first. With the new check in place and the stories untouched, the built Storybook fails exactly eight tests of 235: the generic "story rendered nothing" check for each of the four `Flow/SketchBackdrop` stories, and the focused geometry test for each (`packages/pages/e2e/storybook.spec.ts:94-170`). No other story fails, so the strengthened predicate rejects nothing legitimate.
- **developer** (2026-09-29T14:10:00.000Z): The cause is not the one the issue guessed. A temporary `console.log` in `SketchBackdrop.harness.svelte` showed the effect running once with `initial` undefined and never again: the harness never received its `nodes` prop at all, so the `bind:nodes` write-back was not the culprit. The stories declared `component: SketchBackdrop, render: Harness` in `defineMeta`, and `addon-svelte-csf` does not pass story args through a meta-level `render`; every sibling harness story declares `component: Harness`. `packages/pages/src/lib/flow/SketchBackdrop.stories.svelte:62` now does, and the unused `SketchBackdrop` import is gone. After the change the harness logged eight nodes at mount. The harness itself is untouched: its `initial ?? []` guard and effect are harmless, though the comment above them describes args arriving undefined for a tick, which was this bug seen from the wrong side.
- **developer** (2026-09-29T14:10:00.000Z): Predicate at `packages/pages/e2e/helpers.ts:208-239` (`paintedIn`, `meaningful`): a story is painted when its readable text (the `.svelte-flow__attribution` text removed), plus its SVG shapes, plus its `.svelte-flow__node` count is above zero. A shape counts only outside `defs`/`clipPath`/`marker`/`mask`/`pattern`, with a non-blank `d` for paths, and a `getBBox` with width or height. Chosen over a text-only rule because several legitimate stories (icons, diagrams) paint only SVG; chosen over a bare SVG count because an empty backdrop is still an `<svg>`. `storybook.spec.ts:64` uses it for every story; the `RENDERS_NOTHING` allow-list is unchanged.
- **developer** (2026-09-29T14:10:00.000Z): The blank story is proved against DOM rather than a shipped story, because a deliberately blank story in the catalogue would fail its own check (`packages/pages/e2e/storybook.spec.ts:178-215`). The fixture is a flow canvas with the attribution, a clip path with an empty `d`, three empty backdrop paths (one whitespace-only) and a zero-size rect; it must score `{ text: 0, shapes: 0, nodes: 0 }`. A second test shows real geometry, a flow node and plain words each score. The focused geometry test asserts each story's node count (6, 8, 6, 1), a blob spanning more than 50 by 50, boundaries where the story has two or more regions, and domain borders for the two-domains story only.
- **developer** (2026-09-29T14:10:00.000Z): Checks, run against a separate Playwright config that starts only the Storybook server on 4176 (the full config holds 4173, which the lead's gate owns): `npx storybook build` green, `storybook.spec.ts` 235 passed; pages vitest 768 passed, 1 skipped, and `src/site.test.ts` failing only because `packages/pages/app` was not built in this worktree. `npx @biomejs/biome check` on the three touched source files reported no findings; both gates stay unchecked until the lead runs them.
