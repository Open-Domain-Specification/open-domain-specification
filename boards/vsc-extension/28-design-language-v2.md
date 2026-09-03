---
column: todo
labels: [frontend, docs]
priority: high
agent: designer-fable
updatedAt: 2026-09-04T10:40:00.000Z
---
# Design language v2: VS Code UX guidelines, information density, and v2 primitives in Storybook

The pages UI grew as a port of a Mantine-style web app: chips and badges for everything, boxed cards, decorative colour. It runs inside VS Code, a static export and a browser, and its readers are architects, developers and product people scanning a lot of structured information. This card produces the design language the v2 views will follow and the v2 primitives (atoms and molecules) in Storybook, beside v1, without touching any shipped template.

## Checklist

- [ ] `docs/design/design-language-v2.md`: principles (VS Code UX guidelines for webviews; density; hierarchy by type and space, not boxes; colour only for meaning; codicons for kinds; native-feeling lists, tables and links), the type scale in VS Code units, spacing scale, the token map onto `--vscode-*` variables, and a component-by-component v1 to v2 verdict (keep, restyle, replace, remove) for every file in packages/pages/src/lib/{atoms,molecules,organisms,templates}
- [ ] Audit evidence: a screenshot of every v1 story and view in light and dark, saved under `docs/design/audit/`, with the density and clarity problems called out in the doc
- [ ] v2 primitives under `packages/pages/src/lib/v2/` with stories titled `V2/...`: label/keyword treatment replacing the chip-for-everything pattern, kind icon plus name lockup, definition list, data table (dense, native look, sortable header optional), inline link and ref treatment, section and subsection headings, a comment list, a disposition treatment, empty state, and the hover card frame; each with light, dark and high-contrast stories and a density story where rows are laid out
- [ ] `docs/design/v2-specs/` one short spec per organism and template (all 12 organisms and 16 templates) naming which primitives it uses and sketching its layout in words or ASCII, for the implementation cards
- [ ] `e2e/storybook.spec.ts` widened to the `V2/` titles; pages unit coverage unchanged (v2 primitives tested to 100%)

## Comments

- **lead** (2026-09-04T10:40:00.000Z): Assigned to the senior designer (a Fable agent with the frontend-design skill). Fixed by decision: v1 stays shipped and untouched; v2 lives under `src/lib/v2/` and `V2/` stories only. Source of truth for platform conventions is Microsoft's VS Code UX guidelines (https://code.visualstudio.com/api/ux-guidelines/overview, especially the webview page) and the VS Code theme tokens the page already maps in packages/pages/assets/page.css. Readers and their jobs: an architect checking boundaries and patterns, a developer finding what an aggregate owns and what crosses a boundary, a product person reading descriptions, comments and health. Density and clarity beat decoration; a badge is used only where a native VS Code surface would use one. The designer decides everything visual and journals each decision with its reason; the lead decides only scope. Work in your worktree; `npm ci` there first if node_modules is missing; if the card is missing, `git reset --hard develop` there first. Storybook: `npm run build-storybook -w packages/pages`, serve `storybook-static` with `node e2e/static-server.mjs 4190 storybook-static`, screenshot `iframe.html?viewMode=story&id=<id>` with Playwright; story bodies must be `{#snippet template()}`.
