# AttributesSection

`packages/pages/src/lib/organisms/AttributesSection.svelte`. Verdict: restyle.

## Primitives

`Section` (restyled, see [organism-section](organism-section.md)),
`DataTable`, `Lockup`, `Ref`, `Keyword`, `EmptyState`.

## Layout

```
Attributes                                              (Heading 2 + count)
An entity is known by its identity, not its attributes ...  (lead)

      Attribute     Type          Description
  🔑  petId         int64         Identifies one pet
      name          string
      category      Category ↗    The kind of animal
```

Columns: a 16px key column holding the `key` codicon in `icon.foreground` for
an identity attribute (title "identity"); attribute name in the editor font;
type in the editor font, a `Ref` to the value object when there is one;
description as body text, the last column so it takes the width. No
uppercase header, no per-row rule. The count badge on the heading is the
number of attributes.

Empty: `EmptyState "No attributes."`. The same table is the `AttributeTable`
molecule restyled, reused by the structure subsections and the schema pages.
