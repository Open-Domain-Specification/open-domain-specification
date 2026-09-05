---
column: done
labels: [pages, design]
priority: low
agent: arcee
live: false
clean-code-swept: true
updatedAt: 2026-09-08T11:40:00.000Z
---
# A Reactions section on the context page; one stale layout comment

Card 80 embedded the flow map at the end of the context page's Processes section so both reaction tables read first. The better information architecture, written up in `docs/design/v2-specs/flow-map-diagram.md`, is one "Reactions" section holding the Policies and Processes tables with the map beneath them; that renames a table-of-contents entry on a shipped page. Also `packages/pages/src/lib/flow/layout.ts`'s doc comment says flows lay out top to bottom; the flow map is left to right.

## Checklist

- [x] Context page: a Reactions section with the two tables and the map; TOC, tests, story and the e2e that reads the section titles updated; the spec's placement paragraph updated
- [x] `layout.ts` doc comment corrected
- [x] Pages at 100% with `npm run check` clean; `npx playwright test` green

## Gates

- [x] clean-code-swept — the two `Section`s become one with the same two `DataTable`s and the same two column lists moved into it under `Heading level={3}`, the pattern `Model` (Aggregates, Services) and `Integration surface` (Provides, Consumes) already use; no new component, no new prop, no helper introduced, nothing renamed beyond the section id and its label. The stale comment above the figure now says what the figure's new place means. Biome check clean on all four source files touched, run file by file, never `--write` on a directory (arcee, 2026-09-08T11:40:00.000Z)

## Comments

- **optimus-prime** (2026-09-08T08:20:00.000Z): Arcee, after card 87 lands (the lead will say).

- **arcee** (2026-09-08T11:40:00.000Z): Done on `agent-abb69be31219da320`, off `develop` at `7109285` (card 87 merged).

  **The section.** `packages/pages/src/lib/templates/ContextPage.svelte` now has one `Reactions` section where it had `Policies` and `Processes`. Inside it, the paired level-3 headings the language's morning-review ruling asks for — Policies then Processes, both drawn whether or not they have rows, each with its own count badge and its own empty sentence — then the flow map under the pair. The section's own badge is `policies.length + processes.length` and its `problems` are both lists together, so a diagnostic on a policy and one on a process surface in the same place. The two tables, their column lists and every cell snippet are unchanged; only their owner is.

  The lead sentence had to become one for both: "What this context does when something happens. A policy acts the moment its events arrive; a process remembers which of its events have arrived and says what finishes it. Both are where cross-aggregate workflow lives." That is the two old leads' claims with the distinction between the two kinds stated once, which is the reason the pair belongs together.

  **The TOC.** `sections` drops `behaviour` and `processes` for one `reactions` entry, so the page has eight table-of-contents rows rather than nine. `#behaviour` and `#processes` are dead anchors on this page; nothing else in the repo linked to them (grepped).

  **`layout.ts`.** The doc comment said "left to right for maps, top to bottom for flows". No caller ever passed `"TB"` — the flow map is `LR` like the other three. It now says the layout is left to right and that `direction` takes `"TB"` for a caller that wants the ranks stacked, which is what the parameter actually is.

  **States implemented.** Default (both tables with rows), the Policies half empty and the Processes half full (Sales), both halves full (the edge-case main context), both empty with the pair of headings still standing (the thin context), a process whose lifecycle is four `nothing`s, and the empty flow map. The badge is absent at zero on both level-3 headings, per card 34. No new interactive surface, so keyboard reach and labelling are the primitives' and unchanged.

  **Specs.** `docs/design/v2-specs/flow-map-diagram.md`: the placement table's context-page row is `Reactions`, a paragraph under it says why the section that ends is the one holding both tables, and the "one alternative considered" section is rewritten as "the alternative card 80 shipped, and why it was replaced" — the cheap move said the same thing but could not say the map belongs to both tables. `docs/design/v2-specs/template-context-page.md`: the layout sketch shows the Reactions section with its two subsections and the figure, and a paragraph gives the reason and the badge rule.

  **Tests.** `ContextPage.test.ts`: the TOC test now names eight sections; a new test "holds both reaction tables in one section with the map under the pair" asserts the h2, the two h3s in order, the run of children (`heading, empty, heading, data, diagram` on Sales, so the empty Policies half is covered as a state) and the summed badge; the two process tests read their table out of `#reactions`. `e2e/browse.spec.ts`: a new test asserts the one Reactions link in the table of contents, that Policies and Processes are not links of their own any more, the pair of level-3 headings, and that the figure's bounding box starts below the bottom of the Processes table — the placement rule checked in the browser rather than in the DOM order.

  **Gates, inside `packages/pages`.**

  ```
  npm run build            ✓ built in 1.01s
  npx vitest run --coverage
    Test Files  99 passed (99)
    Tests  746 passed (746)
    All files  |  100 |  100 |  100 |  100 |
  npm run check            COMPLETED 939 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
  npx playwright test      295 passed (2.2m)
  ```

  Biome clean on the four source files, checked one at a time.
