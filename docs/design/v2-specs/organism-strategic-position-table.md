# StrategicPositionTable

`packages/pages/src/lib/organisms/StrategicPositionTable.svelte`. Verdict: restyle.

## Primitives

`DataTable` (grouped), `Lockup`, `Keyword`, `Disposition`, `EmptyState`,
`RelationshipDetail` for the expanded row, `HoverCard` for the keyword hovers.

## Layout

```
     With              Description                          Type                 Upstream  Downstream  Disposition
  Depends on                                                                                            (group row)
  ›  ⬚ Pricing         Prices are quoted by Pricing ...     customer-supplier    OHS       ACL
  ›  ⬚ Identity        Identity claims are translated ...   upstream-downstream  PL        ACL         ⚠ refactor
  Depended on by
  ›  ⬚ Reporting       Reporting reads the hub's events ... upstream-downstream  PL        CF          ⓘ tolerated
  Works alongside
  ›  ⬚ Ledger          Money types are one shared def...    shared-kernel                              ⚠ refactor
```

The three groups are `DataTable` groups. The counterpart is a `Lockup`
(with a `warn` keyword after it for a big ball of mud), not a pill. Type and
roles are `Keyword`s, roles `mono`, each with the pattern summary as its
hover. The disposition column is `Disposition`. The chevron toggle column
stays exactly as today (it is a native disclosure) and is only present when
any row has evidence, as today.

The expanded row spans all columns and renders `RelationshipDetail` with
`heading="h3"`, indented by the toggle column's width; no frame around it.

The description column is capped at 34ch and wraps, as today. The table is
full width; description takes the remaining width.
