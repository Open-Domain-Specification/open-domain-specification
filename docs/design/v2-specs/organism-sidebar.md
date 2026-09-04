# Sidebar

`packages/pages/src/lib/organisms/Sidebar.svelte`. Verdict: restyle (site only).

## Primitives

`Lockup` for each row (icon in its symbol colour, name as the row link).

## Layout

```
 ⦿ Swagger Petstore (v3)                     (brand: logo + workspace name, body size)
 ⬚ Petstore Commerce
    ⬚ Catalog
    ⬚ Sales
 ⬚ Catalog BC
    ⬚ Pet
    ⬚ PetApp
 👥 Pet Shop Team
```

Already a tree; three changes. The brand line loses its uppercase
`toc-title` styling and is body text. Rows are 22px and indent by 16px per
level, as the workbench tree does (v1 uses 14px). The active row uses
`list.activeSelectionBackground` and `list.activeSelectionForeground`
instead of the link colour, and hover uses `list.hoverBackground`; in high
contrast, the dashed `contrastActiveBorder` outline.

This component is not rendered in the extension (the tree view is the
navigation), so it stays in `assets/site.css`.
