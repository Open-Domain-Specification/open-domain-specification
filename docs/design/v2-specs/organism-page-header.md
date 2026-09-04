# PageHeader

`packages/pages/src/lib/organisms/PageHeader.svelte`. Verdict: replace.

## Primitives

`Ref` (crumbs), `Heading` level 1, `Lockup size="title"`, `Markdown`,
`DefinitionList` + `Definition`, `Keyword` (for what v1 put in `meta`).

## Layout

```
Swagger Petstore (v3) › Catalog BC                      (crumbs: Refs, › in secondary)
⬚ Pet  pet  Aggregate                                   (Heading 1: Lockup title, id, kind as detail)
A pet listed in the store. One aggregate because ...    (description, 80ch)

Root        ⬚ Pet                                       (DefinitionList)
Context     ⬚ Catalog BC
```

The uppercase kind eyebrow becomes the `detail` of the title lockup, after
the id, in the secondary colour at 0.6em of the title. The id loses its
bordered pill. The facts strip becomes a `DefinitionList` under the
description; terms in sentence case.

What v1 rendered in the `meta` slot (chips beside the title) is a set of
`Keyword`s on their own line under the title, or in the definition list when
it has a term: the workspace version becomes `Version  0.2.0`; a consumable's
`event · internal · published-language` becomes three keywords; big ball of
mud is a `warn` keyword; a disposition is a `Definition "Disposition"` with
`Disposition` inside. Nothing sits inside the h1 but the lockup.

Crumbs stay one line; the separator is `›` in the secondary colour.
