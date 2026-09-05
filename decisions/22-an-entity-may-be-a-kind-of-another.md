# 22. An entity or value object may be a kind of another

Date: 2026-09-07

## Status

Accepted (2026-09-07; the architect review raised no objection and the reasoning stands)

## Context

Decision 15 refused subtyping: a hierarchy usually hides a missing concept, and modelling it as `includes` would be wrong, so the model refused rather than misdrew. The condition for reopening was a reference model that cannot name its concept without inheritance. Two do. NorthBank's accounts are current, savings and loan accounts: one identity scheme, one lifecycle, one set of invariants on balances, and attributes each kind has and the others do not. An insurer's coverages, a marketplace's offers, a logistics network's legs are the same shape. Flattening them into one entity leaves attributes that apply only sometimes, which decision 24 can now mark optional but cannot explain; splitting them into three aggregates says they are consistent separately, which is false. The ubiquitous language has a word for this relation, "is a kind of", and the model should be able to write it.

## Decision

- `EntitySchema.specialises?: { $ref: string }` and `ValueObjectSchema.specialises?: { $ref: string }`: this entity or value object is a kind of the named one and has every attribute and relation of it, plus its own.
- An entity specialises an entity of its own aggregate; a value object specialises a value object of its own context or one it borrows through a shared kernel. `specialisation-in-boundary` (error) enforces both.
- The chain is finite: `specialisation-cycle` (error). A subtype is never itself `root: true`; the aggregate has one root and a kind of the root is reached through it (`specialisation-not-root`, error). A root may be specialised.
- Attributes are not repeated on the subtype; a subtype that redeclares a parent's attribute name is an error (`specialisation-redeclares`), because the reader would not know which one applies.
- No abstractness flag: a parent that no instance is ever "just" is a fact for its description. No multiple parents: a thing that is two kinds at once is two things, or the kinds are value objects.

## Consequences

- Schema, workspace model (`Entity.specialises`, `Entity.kinds`, the inherited attribute walk), DSL (`addEntity(name, { specialises })`), `toSchema`/`fromSchema`, JSON schema; `feat!`.
- Relation map draws a generalisation in UML's form, a hollow triangle at the parent; the entity page names the parent and lists the kinds, and its attribute table shows own attributes and, in a second group, inherited ones with their origin; the doc generator prints the same; the skill's interview asks "are there kinds of this that differ in what they hold?".
- `aggregate-tree` walks `includes` only; specialisation is not containment. `cross-aggregate-reference` and `attribute-relation-coherence` see inherited relations and attributes as the subtype's.
- Decision 15's subtyping section is removed and replaced by a pointer here.

## Amendment (2026-09-07)

The context above guessed NorthBank's accounts as the reference case. Its discovery notes say the platform holds current accounts only, so card 59 took the kinds the interviews actually state: a ledger account is a customer's or a nominal (NorthBank), and a title is a film or a series (StreamLine). Two mechanics settled at implementation: a kind is reached wherever its parent is, so `aggregate-tree`'s reachability walk follows specialisation while its containment checks do not; and a cross-aggregate `references` may target a kind of the other aggregate's root, never a kind of a non-root entity.
