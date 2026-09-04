# Page (layout)

`packages/pages/src/lib/Page.svelte`, with `.layout` and `.toolbar` in
`packages/pages/assets/page.css`. Verdict: keep, with the stylesheet changes
the primitives imply.

## Layout

```
[ toolbar: sticky, 32px, hairline below ]
┌─────────────────────────────────────────────┬──────────────┐
│ main (minmax(0,1fr))                        │ toc (200px)  │
│ 16px 24px gutter, 1200px cap, 64px below    │ sticky       │
└─────────────────────────────────────────────┴──────────────┘
```

Unchanged: two columns, the TOC collapsing under 900px, the sticky toolbar
with icon buttons, the flash on a scrolled-to anchor (`.flash` moves from a
card background to a `list.hoverBackground` wash on the row for 1.6s).

Stylesheet work when the last template moves over: delete the `.card`,
`.grid`, `.chip`, `.pill(s)`, `.facts`, `.crumbs .kind`, `.counts`,
`.problems` and `.relations` blocks, the uppercase `h3`, `th` and
`.toc-title` rules, and the `--core/--supporting/--generic/--card/--radius/
--gap` tokens; add the tokens listed in
[design-language-v2 section 5](../design-language-v2.md#5-colour-the-token-map)
to `assets/site.css`. Until then the v2 primitives reset what they need
themselves.
