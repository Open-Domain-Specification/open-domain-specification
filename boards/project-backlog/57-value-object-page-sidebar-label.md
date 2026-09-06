---
column: done
labels: [pages, design]
priority: low
agent: dev-lite
live: false
clean-code-swept: true
updatedAt: 2026-09-05T00:00:00.000Z
---
# Value object page: sidebar label and section title disagree

the design lead's spec pass after card 49 found the value object page's sidebar section labelled "Used by" while the section's on-page title is "Used as a type by" (`packages/pages/src/lib/templates/ValueObjectPage.svelte`, the `sections` list against the Section title). The spec and the page use the title.

## Checklist

- [x] Sidebar label matches the section title, one string in one place if the template allows it
- [x] The template's test and story assert the label; pages suite green at 100% inside the package directory

## Gates

- `clean-code-swept`: swept 2026-09-05, two files touched, `packages/pages/src/lib/templates/ValueObjectPage.svelte` and `packages/pages/src/lib/templates/templates.test.ts`; nothing dead left behind. biome clean on both.
- `qa-automated`: inside `packages/pages` with absolute paths. `npm run build` clean. `npx vitest run --coverage`: 94 files, 668 passed, all files 100/100/100/100. `npm run check`: 922 files, 0 errors, 0 warnings. `npx biome check` on the two touched files: clean, no fixes.

## Comments

- **lead** (2026-09-07T08:20:00.000Z): dev-lite, whenever a worktree is free; no dependency on other cards.
- **dev-lite** (2026-09-05T00:00:00.000Z): Reset the worktree to `origin/develop` (HEAD "docs(design): v2 specs describe context-scoped value objects; card 57 sidebar label"), `npm install`, then `npm run build --workspaces --if-present` so the pages suite could resolve `@open-domain-specification/core` and `@open-domain-specification/graphviz` (a fresh worktree ships no built dist for either).
- **dev-lite** (2026-09-05T00:00:00.000Z): `ValueObjectPage.svelte`: the `sections` array's `usage` label now reads "Used as a type by" (was "Used by"), matching the section's on-page title exactly. The `Section` for `id="usage"` now takes its `title` from `sections.find((s) => s.id === "usage")!.label` instead of repeating the string, so the sidebar and the section heading cannot drift again — the one string in the module-scope `sections` array is the only place it is written.
- **dev-lite** (2026-09-05T00:00:00.000Z): `templates.test.ts`, in the existing "ValueObjectPage: the usage table..." case: added an assertion that the toc anchor `.toc a[href="#usage"]` reads the same as the `#usage` section's `h2` (stripping the count badge span first), and that both read "Used as a type by". No story change needed — `ValueObjectPage.stories.svelte` renders the shared template through the harness and has no assertions of its own, so it inherits the fix automatically.
- **dev-lite** (2026-09-05T00:00:00.000Z): Card moved to `review`, `live: false`. Did not merge develop into this branch, did not push; ready for the lead's merge.
