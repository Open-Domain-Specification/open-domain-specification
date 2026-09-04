# InvariantsSection

`packages/pages/src/lib/organisms/InvariantsSection.svelte`. Verdict: restyle.

## Primitives

`Section`, `DataTable`, `Lockup`, `EmptyState`.

## Layout

```
Constrained by                                          (Heading 2 + count)
Invariants that name this entity explicitly ...          (lead)

  🛡 NameRequired       Pet.name must be non-empty, because the storefront lists pets by name
  🛡 SoldNotReopen      Once sold, a pet does not revert to available without an explicit policy ...
```

Two columns: the invariant `Lockup` and its description, which is the last
column and wraps. No cards. On the aggregate page the same table gains a
third column, "Constrains", with comma-separated `Ref`s to the targets or
the keyword `whole aggregate`.

Empty: the caller's sentence in `EmptyState`.
