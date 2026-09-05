---
column: todo
labels: [pages, design]
priority: low
agent: bumblebee-lite
updatedAt: 2026-09-07T08:20:00.000Z
---
# Value object page: sidebar label and section title disagree

Jazz's spec pass after card 49 found the value object page's sidebar section labelled "Used by" while the section's on-page title is "Used as a type by" (`packages/pages/src/lib/templates/ValueObjectPage.svelte`, the `sections` list against the Section title). The spec and the page use the title.

## Checklist

- [ ] Sidebar label matches the section title, one string in one place if the template allows it
- [ ] The template's test and story assert the label; pages suite green at 100% inside the package directory

## Comments

- **optimus-prime** (2026-09-07T08:20:00.000Z): Bumblebee-lite, whenever a worktree is free; no dependency on other cards.
