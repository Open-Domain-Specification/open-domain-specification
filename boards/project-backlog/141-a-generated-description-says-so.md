---
column: doing
labels: [pages, doc]
priority: medium
agent: developer
live: true
updatedAt: 2026-09-29T15:12:18.000Z
---
# A generated description says so

Issue #43, a child of epic #62. Where a relationship has no description, the strategic position table falls back to the sentence core generates from its type and roles, and the page drew it exactly as it draws a sentence a person wrote; the generated Markdown did the same with italics alone. A reader could not tell which sentences carry someone's judgement and which are a template filling a gap. The design is decided in `docs/design/v2-specs/relationship-provenance-and-agreements.md`, Spec 1 and the lead rulings: the page marks a generated description with the secondary colour and the keyword `generated` (with a hover title), and the Markdown appends `(generated)`. An authored description keeps its wording on both surfaces.

## Checklist

- [x] Failing tests first: a pages test with an authored and a generated relationship in one table, a doc test for the same two, and a Playwright spec on RiverMart's Order Management page
- [x] Pages: `StrategicPositionTable.svelte` renders a generated description as `description generated` with a `Keyword` reading `generated` and the specified title; an authored one is unchanged
- [x] Markdown: `strategic-position.md.ts` writes `*sentence* (generated)`; the existing test that pinned the bare italic form is updated
- [x] Pages stays at its 100% coverage threshold
- [x] Reference models' diagnostics unchanged; tracked model docs (petstore, clinic) do not change, because every relationship in them carries a description

- [x] One shared rule: `hasAuthoredDescription` in core, read by pages and Markdown, with `""` and whitespace-only tested on both surfaces

## Gates

- [ ] `npx @biomejs/biome check` on the touched files
- [ ] `bash scripts/verify-all.sh`

## Comments

- **developer** (2026-09-29T15:12:18.000Z): Pages change is `packages/pages/src/lib/organisms/StrategicPositionTable.svelte:73` (`GENERATED_TITLE`, word for word from the spec) and `:115-119` (the `{#if r.description}` split), with the colour rule beside `.description` in the same file's style block. The hover title on the counterpart lockup (`:113`) is untouched, as the spec says. One departure from the spec's snippet: the sentence is written `{`${narrativeOf(r)} `}` rather than `{narrativeOf(r)} <Keyword ...>`. The rendered text is the same, but Svelte compiles the plain expression with a nullish fallback whose right side is unreachable, which took `StrategicPositionTable.svelte` to 98.18% branch coverage and the package under its 100% threshold; the template literal compiles without it.
- **developer** (2026-09-29T15:12:18.000Z): Markdown change is `packages/doc/src/strategic-position.md.ts:23-29`, the comment updated to say the suffix is the marker and the italics are the muted look. `packages/doc/src/index.test.ts` "falls back to the generated sentence..." pinned the old form and now expects `(generated)`; the new test at `:725` puts an authored and a generated relationship in one table and asserts the two cells.
- **developer** (2026-09-29T15:12:18.000Z): Tests assert content and provenance. Pages `StrategicPositionTable.test.ts:152` checks the authored span is exactly the authored text with no `generated` class and no keyword, and the generated span carries both classes, starts with core's own sentence, and holds a keyword reading `generated` with the title. `packages/pages/e2e/generated-description.spec.ts` runs against RiverMart's Order Management page (three generated rows, six authored) and checks every generated row has the keyword and title, no authored row has either, and the two sets differ in colour. It failed against the old component (the generated count was 0) and passes against the new. It ran on a throwaway config on port 4183 that has been deleted; the cross-host pass is the lead's.
- **developer** (2026-09-29T15:12:18.000Z): Model builds. Petstore and clinic each report 0 diagnostics and `git status` is clean after `npm run build`, so no tracked model docs change: every relationship in both carries a description. RiverMart, StreamLine and NorthBank docs are generated and ignored by git, and 35 of their pages now carry `(generated)`; their diagnostics are as pinned.
- **developer** (2026-09-29T15:30:00.000Z): Lead found a mismatch: pages fell back when `r.description` was falsy but Markdown used `??`, so `description: ""` (which the DSL writes) gave the generated sentence on the page and an empty cell in Markdown. Fixed with one predicate, `hasAuthoredDescription` in `packages/core/src/narrative.ts:241`, beside the sentence it guards. Both `packages/pages/src/lib/organisms/StrategicPositionTable.svelte:116` and `packages/doc/src/strategic-position.md.ts:29` ask it. The rule: a description is authored only if it has non-whitespace text, so `undefined`, `""` and whitespace-only all count as generated and get the marker. An authored description is still printed as written, untrimmed. Tested in `packages/core/src/narrative.test.ts`, the pages table test and the doc test, each for `""` and a whitespace-only string. Petstore and clinic rebuilt with 0 diagnostics and no `models/*/docs` change.
