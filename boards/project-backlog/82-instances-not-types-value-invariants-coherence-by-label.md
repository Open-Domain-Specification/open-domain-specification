---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: ironhide
updatedAt: 2026-09-08T03:00:00.000Z
---
# The aggregate tree stops judging types; a value object owns its invariants; coherence matches by label; a ring behind an ACL is not a ring

Codex review run 1, issues 1, 4, 10 and 11, each reproduced. A questionnaire whose groups contain questions that contain groups is a finite instance tree that `aggregate-tree` rejects because two types contain each other. NorthBank's IBAN defines checksum validity and the invariant has to live on Account because a value object cannot own one. `attribute-relation-coherence` matches the first relation to the target type, so a current address and an address history warn wrongly, and petstore's optional `status` attribute sits beside a relation of cardinality 1 undetected. And `relationship-cycle` tells two contexts that translate each other through anti-corruption layers that they cannot change first.

## Checklist

- [ ] `aggregate-tree` keeps reachability from the root and the containment target checks and drops every cycle check on types, self or mutual; doc comment and catalogue say why (the model declares types; a tree of instances is the code's to keep); decision 15's aggregate-tree entry rewritten by the lead
- [ ] `ValueObjectSchema.invariants`: an invariant of a value object constrains that value object's own attributes and nothing else, needs no guard, and is the kind that holds by construction; `invariant-in-value-object` (error) keeps its targets inside; DSL, `toSchema`/`fromSchema`, JSON schema, refs, pages (value object page Invariants section; invariant page says the kind), doc generator, skill; NorthBank's IBAN checksum moves to IBAN; other models where a value's own rule sits on an aggregate
- [ ] `attribute-relation-coherence` matches an attribute to a relation by label when several relations target the same type (a relation's `label` equal to the attribute's name, or the only relation to that type when there is one), and checks optionality against cardinality: optional with `0..1` or `*`, required with `1` or `1..*`, array with `*` or `1..*`; the contradiction in petstore's `Pet.status` fixed honestly; tests for the current-address-and-history case
- [ ] `relationship-cycle` does not count a step whose downstream declares `anti-corruption-layer` toward that upstream, because the ACL is what lets it evolve independently; the message says the contexts depend on each other's contracts and names three repairs, an ACL, a partnership, or turning a call into an event; decision 20 amended by the lead
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Comments

- **optimus-prime** (2026-09-08T03:00:00.000Z): Ironhide, after card 81 lands (the lead will say); `feat!`.
