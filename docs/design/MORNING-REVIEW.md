# Design sprint: morning review

Written by the tech lead at the end of the 2026-09-04 design sprint. Nothing shipped has changed; every v2 surface lives beside v1 in Storybook.

## How to look

```sh
cd packages/pages
node scripts/codicons.mjs && npm run build-storybook
node e2e/static-server.mjs 4190 storybook-static   # then open http://localhost:4190
```

Start with **V2/Compare**: sixteen stories, one per template, v1 on the left and v2 on the right against the petstore model. Then **V2/Templates** for each page in light, dark and high contrast, **V2/Organisms** and **V2/Layout** for the chrome, and the ten **V2/** primitives. The design language is `design-language-v2.md`; every organism and template has a spec under `v2-specs/`; the v1 audit screenshots are in `audit/` on disk.

## What changed, in one paragraph each

- **Language**: every screen is a list at the platform's 22px row; hierarchy by type and space, not boxes; colour only where VS Code colours (links, kind icons in the Outline's symbol colours, diagnostics); a word, not a pill, for classifiers; codicons once per row; native tables and hover; the one badge is the count on a heading; disclosure in the editor's hover frame.
- **Primitives**: Keyword, Lockup, Ref, DefinitionList, DataTable (grouped, sortable, with a detail row), Heading, Comments, Disposition, EmptyState, HoverCard. No card, grid, pill, chip or tag list exists in v2.
- **Pages**: card grids became tables (subdomains, contexts, teams, provides, consumes, attributes, relations); facts became definition lists; the health report became the Problems-panel treatment; the aggregate page reads top to bottom at about half the height of v1 with the same content.

## The designer's three least-sure decisions

1. **Kind icons in the Outline's symbol colours.** Platform convention and findable at a glance, but four hues on a page whose principle is restraint. Fallback: colour only the title lockup.
2. **Subdomain classification loses its colour.** `core` / `supporting` / `generic` are plain keywords in a sortable column. Fallback: sort that column first.
3. **No hairline between table rows.** One rule under the header, then rhythm and hover, as the keybindings editor does. On wide tables with wrapped descriptions v1's per-row rule helped. Fallback: a 50% `panel.border` hairline per row.

## Nits found while landing, and how they were ruled

The human approved the design on 2026-09-05 with the three least-sure decisions as designed. The designer ruled on the nits on card 34; the reasons are in the card's journal and in section 11 of `design-language-v2.md`.

- The **context page compare story** collapses the v1 column to a sliver (the v1 diagram forces the width). Card 33 gives the harness a min-width per column; not ruled here.
- An **empty section showed a `0` count badge**. Ruled: the section stays, the badge goes at zero. The platform never draws its count badge at zero and the empty sentence already carries the zero in words. Applied once in `Heading`, so every template, organism and the health report follow.
- **ContextPage always draws the Services heading** with an empty table. Ruled: keep. A paired subsection is the fixed shape of its section and the shape is the information; VS Code keeps an empty pane with a sentence rather than removing it. The same holds for every paired subsection in v2.
- **HealthPage drew its own header**. Ruled: it uses `PageHeader` with a plain title, no lockup. A report has no kind, id or detail, and a workspace lockup would claim the page is the workspace, which the crumb already names. The pulse codicon stays, at a title lockup's icon size.
- The workspace page's health section was **"Model health"** beside a page called **"Health"**. Ruled: the section is "Health", its first heading is "Structure" (badged with the diagnostic count), then Refactor, Tolerated and No comments. One question, four kinds of answer, one name shared by the section, the page and the tree node.
- Naming: `V2Page.harness.svelte`. Ruled: left until cards 35 and 36 delete v1 and the compare harness (which card 33 owns and which imports it), when every `V2` prefix goes stale and the harnesses are renamed together: `Strategic.harness.svelte` beside `Tactical.harness.svelte`.

## After approval

One card per template swaps v2 into the shipped route (`Page.svelte` and `resolve.ts`), deletes the v1 template and its organisms once nothing imports them, and re-runs every e2e and the real-VS-Code suite. The doc generator is unaffected: it emits markdown, not components. The extension picks the change up from the pages bundle. Suggested order: workspace, context, aggregate first, since they carry the most information.
