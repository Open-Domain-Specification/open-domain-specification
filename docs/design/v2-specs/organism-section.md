# Section

`packages/pages/src/lib/organisms/Section.svelte`. Verdict: restyle.

## Primitives

`Heading` level 2 with `lead` and optional `count`; restyled `Problems`.

## Layout

```
                                                        (32px above)
Strategic position  (5)                                 (Heading 2, count badge)
Who this context depends on and who depends on it ...   (lead, 80ch, secondary)
  ⚠ relationship-has-no-comments  Sales → Inventory has no comments.  go to
                                                        (problems, if any)
[children]
```

The bottom rule under the section header goes; the 32px above the heading
and the weight carry the hierarchy. `count` is passed by the template when
the section lists things (aggregates, consumables, terms), and it is the
number of rows; at zero no badge is drawn and the section stays, its empty
sentence carrying the zero (card 34).

Problems render as the Problems panel does: severity codicon in
`editorError`/`editorWarning`, the rule id as a `mono` keyword, the message,
a `Ref "go to"`. No left rule, no frame, 22px rows.

`scroll-margin-top` stays 40px for the sticky toolbar.
