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

## Open nits found while landing

- The **context page compare story** collapses the v1 column to a sliver (the v1 diagram forces the width). The v2 column and the `V2/Templates/ContextPage` stories are fine; the harness needs a min-width per column.
- An **empty section shows a `0` count badge** (card 31's choice where the spec was silent); v1 hid empty sections. Decide: hide, or keep the zero.
- **ContextPage always draws the Services heading** with an empty table (card 30 took the plainer path); v1 hid it. Same decision as above.
- **HealthPage draws its own header** rather than PageHeader because it has no lockup or id. Acceptable, or give it a lockup with the workspace's icon.
- The workspace page has two health sections, **"Model health"** (structural rules) and **"Health"** (evidence). Suggested: "Structure" and "Health".
- Naming: `V2Page.harness.svelte` covers only the seven strategic pages and would read better as `V2Strategic`.

## After approval

One card per template swaps v2 into the shipped route (`Page.svelte` and `resolve.ts`), deletes the v1 template and its organisms once nothing imports them, and re-runs every e2e and the real-VS-Code suite. The doc generator is unaffected: it emits markdown, not components. The extension picks the change up from the pages bundle. Suggested order: workspace, context, aggregate first, since they carry the most information.
