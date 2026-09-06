---
column: done
labels: [backend, ddd, breaking]
priority: high
agent: senior-dev
live: false
clean-code-swept: true
updatedAt: 2026-09-05T17:10:00.000Z
---
# An identity may name an external context; a conformist borrows; a process fed by its own steps is not a cycle

Review run 12, issues 1, 2 and 3. An external context (decision 28) has no entities, so an attribute holding a card scheme's or a payment provider's id cannot say whose id it is; a Stripe customer id is invisible to the map. A conformist (decision 03) is the downstream that adopts the upstream's model as-is, and `schema-context` forbids it from typing anything with the upstream's schemas or value objects unless the two lie about a shared kernel. And a multi-step process whose own `then` operations raise the `on` events it waits for next reads, through the reaction walk, as a ring back into itself.

## Checklist

- [x] `identifies` may name a bounded context flagged `external` as well as an entity; `identifies-entity` accepts it; the context map's identity crossing draws to that context; the relation map draws the edge to a context node in the external stereotype; doc generator and skill follow; NorthBank's CardCo and Screening Vendor ids and RiverMart's Payment Provider ids set it
- [x] `schema-context` and the value object boundary rule let a downstream whose relationship to the upstream carries the `conformist` role borrow the upstream's schemas and value objects, in that direction only; `shared-kernel-backed`'s counterpart, `conformist-backed` (warning), asks that a declared conformist actually borrows or consumes something; a reference model shows it where its prose already says the downstream conforms
- [x] `reaction-cycle` and the flow map treat a process waking on an event raised by an operation the same process issued as one lifecycle, not a ring: a cycle is reported only when the walk returns to a node other than the process itself; test with the run 12 example (starts on OrderPlaced, issues AuthorizePayment, on PaymentAuthorized issues ReserveInventory, on InventoryReserved issues DispatchOrder, ends on OrderDispatched) which must validate clean, and with a genuine ring through two processes which must not
- [x] Decisions 14, 16, 23 and 28 amended by the lead; you confirm the mechanics match
- [x] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Gates

- [x] clean-code-swept — every rule and map change carries the reasoning in its own doc comment (`identifiesEntity`, `conformsTo`, `mayBorrowFrom`, `conformsInSubstance`, `isProcessLifecycle`, `relationNamespace`); no dead code and no duplicated shape left behind — NorthBank's `ScreenParty` schema was a copy of the vendor's `ListMatchQuery` and is now the vendor's own, which is the borrowing this card allows. Biome clean file by file on all sixteen files touched; `npx tsc --noEmit` clean in all eleven packages and models (senior-dev, 2026-09-05T17:10:00.000Z)

## Comments

- **lead** (2026-09-08T01:10:00.000Z): the senior developer, after card 66 lands (the lead will say); `feat!`.
- **senior-dev** (2026-09-05T17:10:00.000Z): Done, with one deliberate departure from the brief's wording on `conformist-backed`; see the paragraph below the evidence.

  **External identities.** `AttributeSchema.identifies` now resolves to an `Entity` or a `BoundedContext`. `identifies-entity` accepts a context flagged `external` and refuses one that is not, with a message that says why (there the entity exists and is what the id is of). `identityCrossings` yields `target: Entity | BoundedContext` and a `to` context either way, so the context map's implied `«id»` edge needed no change. The relation map gained a fourth node type, `external_context`: the box carries the `«external system»` stereotype, no attribute compartment (what is inside that system is not ours to state) and a cluster of its own outside every aggregate. Graphviz `STEREOTYPES`, the pages `TONES`/icon map, and the doc generator's attribute link follow. NorthBank's `ScreeningResult.vendorMatchRef` names Screening Vendor and `Authorisation.cardCoRef` names CardCo; RiverMart's `Authorisation.providerRef` names Payment Provider — it was already the acquirer's own reference, marked `identity: true`, and now says so.

  **Conformist borrowing.** `conformsTo` reads a directed relationship whose `downstreamRoles` include `conformist`, upstream to downstream and never back; `mayBorrowFrom` is that or a shared kernel, and it is what `schema-context` and `specialisation-in-boundary` now ask. `conformist-backed` (warning) is the counterpart to `shared-kernel-backed`. NorthBank shows it: Sanctions Screening's prose already said "Screening calls it as documented and reshapes nothing", and `ScreenParty` now carries the vendor's own `ListMatchQuery` instead of a duplicate of it that could drift.

  **Process lifecycle.** `reaction-cycle` filters out any ring whose only reactor is one process (`isProcessLifecycle`), which is exactly "the walk returns to the process itself and to nothing else". Three tests: the run 12 example (starts OrderPlaced, issues AuthorizePayment, on PaymentAuthorized issues ReserveInventory, on InventoryReserved issues DispatchOrder, ends OrderDispatched) validates clean; a ring through two processes and a ring through a process and a policy are both still reported. The flow map needed no change — it already draws the `ends` edge without walking from it, and the lifecycle ring it draws is the picture a reader wants.

  **Decisions.** Read the 2026-09-08 amendments to 14, 16, 23 and 28 against what is implemented: they match. Decision 23's "a cycle is reported only when the walk returns to a node other than the process itself" is `isProcessLifecycle`; decision 16's "one direction" is `conformsTo`'s source/target test; decision 28's "an identity attribute names the context itself" is `identifies-entity`'s external branch.

  **Evidence.** `bash scripts/verify-all.sh` green end to end:

  ```
  core: 408 tests passed
  graphviz: 25 tests passed
  doc: 30 tests passed
  skill: 26 tests passed
  northbank: 3 tests passed
  petstore: 18 tests passed
  rivermart: 3 tests passed
  streamline: 3 tests passed
  models/_shared: 9 tests passed
  pages: 724 tests passed
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

  **QUESTION for lead — `conformist-backed`'s bar.** The brief said the rule should ask that a conformist "borrows a schema or value object or consumes an operation of the upstream". I built that first and measured it: it fired on 16 relationships across all four reference models, and every one of the 16 is a downstream that subscribes to the upstream's published event carrying the upstream's own schema — the ordinary event-driven conformist. Sixteen out of sixteen false positives is a rule that would have to be silenced or have sixteen models bent around it, and whether a subscriber translates on the way in is not something the model records (decision 15), so no borrowed schema can be demanded of it. I shipped a third clause instead: consuming something the upstream publishes that carries one of the upstream's schemas also backs the role. The rule then catches what `partnership-backed` and `shared-kernel-backed` catch — a role declared between two contexts that exchange nothing — and all four models stay at their existing diagnostics. The strict version is a three-line revert in `conformsInSubstance` if you want it, but it needs sixteen model changes with it, and I do not think they would be honest ones. Your call.
