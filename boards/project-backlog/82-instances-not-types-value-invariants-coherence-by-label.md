---
column: done
labels: [backend, ddd, breaking]
priority: high
agent: ironhide
live: false
clean-code-swept: true
updatedAt: 2026-09-05T18:40:00.000Z
---
# The aggregate tree stops judging types; a value object owns its invariants; coherence matches by label; a ring behind an ACL is not a ring

Codex review run 1, issues 1, 4, 10 and 11, each reproduced. A questionnaire whose groups contain questions that contain groups is a finite instance tree that `aggregate-tree` rejects because two types contain each other. NorthBank's IBAN defines checksum validity and the invariant has to live on Account because a value object cannot own one. `attribute-relation-coherence` matches the first relation to the target type, so a current address and an address history warn wrongly, and petstore's optional `status` attribute sits beside a relation of cardinality 1 undetected. And `relationship-cycle` tells two contexts that translate each other through anti-corruption layers that they cannot change first.

## Checklist

- [x] `aggregate-tree` keeps reachability from the root and the containment target checks and drops every cycle check on types, self or mutual; doc comment and catalogue say why (the model declares types; a tree of instances is the code's to keep); decision 15's aggregate-tree entry rewritten by the lead
- [x] `ValueObjectSchema.invariants`: an invariant of a value object constrains that value object's own attributes and nothing else, needs no guard, and is the kind that holds by construction; `invariant-in-value-object` (error) keeps its targets inside; DSL, `toSchema`/`fromSchema`, JSON schema, refs, pages (value object page Invariants section; invariant page says the kind), doc generator, skill; NorthBank's IBAN checksum moves to IBAN; other models where a value's own rule sits on an aggregate
- [x] `attribute-relation-coherence` matches an attribute to a relation by label when several relations target the same type (a relation's `label` equal to the attribute's name, or the only relation to that type when there is one), and checks optionality against cardinality: optional with `0..1` or `*`, required with `1` or `1..*`, array with `*` or `1..*`; the contradiction in petstore's `Pet.status` fixed honestly; tests for the current-address-and-history case
- [x] `relationship-cycle` does not count a step whose downstream declares `anti-corruption-layer` toward that upstream, because the ACL is what lets it evolve independently; the message says the contexts depend on each other's contracts and names three repairs, an ACL, a partnership, or turning a call into an event; decision 20 amended by the lead
- [x] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Gates

- [x] clean-code-swept — every rule change carries its reasoning in its own doc comment (`aggregateTree`, `usesOfValueObject`, `cardinalityDiagnostics`, `attributeRelationCoherence`, `invariantInValueObject`, `translatedByAcl`, `relationshipCycle`); `includesCycles` and the `children` map it walked are deleted rather than left unused, and the value object page's two invariant sections are one organism called twice rather than a second table. Biome clean file by file on all twenty-four code files touched; `npx tsc --noEmit` clean in core, doc, graphviz, skill, all four models, apps/docs and apps/ods-vscode, and `npm run check` (svelte-check) clean in pages (ironhide, 2026-09-05T18:40:00.000Z)

## Comments

- **optimus-prime** (2026-09-08T03:00:00.000Z): Ironhide, after card 81 lands (the lead will say); `feat!`.
- **ironhide** (2026-09-05T18:40:00.000Z): Done, all four issues, no departures from the brief. One thing for you below the evidence.

  **The aggregate tree stops judging types.** `aggregate-tree` keeps the two containment checks (an `includes` points at an entity, a `uses` at a value object) and reachability from the root; `includesCycles` is gone, with the `children` map that fed it. The doc comment and the catalogue entry say why in the card's own terms: the claim is about instances, the model declares types, and a questionnaire whose groups hold questions that hold groups is a finite tree in every instance. The old test "refuses a cycle of includes through two distinct entity types" is now "allows two entity types that include each other, because the instances still form a tree". Decision 15's rewritten aggregate-tree entry matches what is implemented.

  **A value object owns its invariants.** `ValueObjectSchema.invariants` joins the aggregate's and the context's; `InvariantKind` gains `value` and `Invariant.owner` widens to `Aggregate | BoundedContext | ValueObject`. `invariant-in-value-object` (error) allows the value's own attributes (inherited ones included) and the value itself, and refuses anything else, so a value's rule can name no entity and no operation — which is also why it needs no guard, and `context-invariant-guarded` never looks at it. DSL (`vo.addInvariant`), `toSchema`/`fromSchema` (wired in the second pass, after the attributes exist), JSON schema, `valueObjectInvariantRef`, `getInvariantByRef`, the visitor, `resolvePage` and `pageRefs`, the value object page (its own Invariants section above the existing Constrained by), the invariant page (a third kind, with its own label, lead and "nothing guards a value's rule"), the doc generator (an Invariants column on the context page's value object table) and the skill all follow. Three rules moved in the models: NorthBank's `IbanChecksumValid` to `IBAN` and `PanLuhnValid` to `PAN` and `ScoreExplained` to `RiskScore`, StreamLine's `LadderHasLowestRung` to `Ladder`. I left the rest where they are: `FrozenAcceptsNoDebits`, `AprWithinCap`, `CancelOnlyBeforeShipment` and the like name a value object but are rules about what the aggregate may do with it, which is the aggregate's to keep.

  **Coherence by label, and optionality against cardinality.** The attribute and its relation are now matched rather than looked up: one relation to the value object is the match, several and it is the one whose `label` is the attribute's name, and an attribute no label picks out is reported as ambiguous with the fix naming the label. The reverse half is symmetric, so a second relation to one value object that names no attribute is reported too. Three number checks, exactly as the card lists: a list against `1` or `0..1`, an optional attribute against `1` or `1..*`, a required attribute against `0..1` or `*`. Codex's current-address-and-history case is three tests (both halves labelled and quiet; each relation read for its own cardinality rather than the first found; the ambiguous pair reported from both sides). Ten honest contradictions fell out of the reference models and all ten are fixed at the half that was wrong: petstore's `Pet.status` keeps `optional` (the v3 contract does not require it) and `has-status` becomes `0..1`; `Order.shipDate`, RiverMart's `Product.brand` and `Shipment.tracking`, StreamLine's `Title.availability`, `Episode.rating`, `Episode.artwork`, `Profile.pin` and `TasteProfile.affinities` become optional, each of them beside a description that already said "absent until…". NorthBank's `LoanApplication.decision` is the tenth, and the same fix. Each model's discovery record says what changed and why.

  **A ring behind an ACL is not a ring.** `relationshipCycle` drops any step whose relationship declares `anti-corruption-layer` among its `downstreamRoles`, and the message no longer claims nobody can change first: it says the contexts depend on each other's contracts and offers the three repairs in the card's order — an ACL, a partnership, or turning a call into an event. Two tests: a mutual pair of calls with an ACL on one side is quiet, and an ACL on a step outside the ring leaves the ring reported. The rule catalogue's fixture had its only ring behind exactly such an ACL, so it now carries a second, unprotected ring (B and D calling each other) and `relationship-cycle` still fires on it. Decision 20's amendment matches what is implemented.

  **Evidence.** `bash scripts/verify-all.sh` green end to end from the worktree root:

  ```
  core: 421 tests passed
  graphviz: 25 tests passed
  doc: 30 tests passed
  skill: 26 tests passed
  northbank: 3 tests passed
  petstore: 18 tests passed
  rivermart: 3 tests passed
  streamline: 3 tests passed
  models/_shared: 9 tests passed
  pages: 727 tests passed
  apps/docs: 23 tests passed
  apps/ods-vscode: 13 tests passed
  pages e2e (diagram-panel-fit): passed
  schema comparison (petstore vs core dist): match
  ```

  Diagnostics per model are unchanged, rule for rule:

  ```
  Swagger Petstore (v3): 0 diagnostic(s)
  NorthBank: 4 — relationship-declared, separate-ways, consumable-kind, context-serves-subdomain
  RiverMart: 2 — aggregate-root, cross-aggregate-reference
  StreamLine: 3 — internal-consumable, schema-context, policy-complete
  ```

  **One thing worth your eye — labels now double as attribute names.** Matching by label means that wherever one value object is used twice, the readable label ("held in", "in arrears of") has to be replaced by the attribute's name ("Balance", "Arrears") or the pair is reported. No reference model hit it — none uses a value object twice — but a core test did, and I changed its labels rather than the rule. The relation map draws that label, so those edges read as field names rather than as phrases. It is what the brief asked for and I think it is right (the label is doing real work there), but if you would rather the map kept its phrasing, the alternative is a `for` field on the relation naming the attribute, and that is a schema change, not mine to make.
