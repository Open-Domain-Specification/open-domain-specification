# RelationshipDetail

`packages/pages/src/lib/organisms/RelationshipDetail.svelte`. Verdict: restyle.

## Primitives

`Heading` (1 or 3, per `heading`), `Lockup`, `Keyword`, `Disposition`,
`Markdown`, `DefinitionList`, `Comments`, `DataTable`, `Ref`, `EmptyState`.

## Layout

```
⬚ Catalog BC ↔ ⬚ Inventory BC   shared-kernel   ⚠ refactor     (Heading, keywords after)
PetStatus and its values are one shared definition               (description)

Roles                                                             (Heading 3)
A shared subset of domain model and code, co-owned by both teams. (symmetric: one line)
  -- or, asymmetric --
Upstream     ⬚ Catalog BC    OHS  Open Host Service — a published API ...
Downstream   ⬚ Sales BC      ACL  Anti-Corruption Layer — a translator ...

Comments                                                          (Heading 3 + count)
  💬 PetStatus and its values live in @petstore/kernel ...   code ↗
  💬 The kernel has grown past the status enum ...           decision ↗

Consumables crossing this boundary                                (Heading 3 + count)
  Consumable            Pattern   Consumed by            Disposition
  📡 PetRegistered      PL CF     InventoryProjection
  📡 PetStatusChanged   PL CF     InventoryProjection    ⓘ tolerated

Links                                                             (Heading 3)
  decision  ADR-014 Shrink the kernel ↗
  code      packages/kernel/src/PetStatus.ts ↗
```

The outer card and the two inner cards go. The title is two `Lockup`s with
the arrow in secondary text; the type is a `Keyword` with the pattern
summary as its title; the disposition is `Disposition`. Roles are a
`DefinitionList`: term Upstream/Downstream, value the context lockup then
each role as a `mono` keyword followed by the pattern name and its summary in
secondary text. Symmetric relationships print the summary once as a
paragraph. Crossings are a `DataTable`. Links are a `DefinitionList` keyed
by link kind with external `Ref`s.

Inside a strategic position row (`heading="h3"`) the block keeps its
spacing at the level-3 scale; as a page (`heading="h1"`) the title is the
page title lockup. Sections keep their ids so the TOC can point at them.
