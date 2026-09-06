---
column: review
labels: [backend, ddd, breaking]
priority: high
agent: senior-developer-deep
live: false
clean-code-swept: true
updatedAt: 2026-09-09T18:40:00.000Z
---
# A mistake is a diagnostic, not a crash; an answer returns to its caller; the rules the review reproduced

The sixth architect review, each item probed. A JSON workspace with one unresolvable reference throws at load (`getReactionTriggerByRefOrThrow`, `Deadline.countsFrom`, a foreign deadline) while the DSL author gets a diagnostic for the same mistake, so an extension author loses every diagnostic to one typo; and the DSL accepts an answer in `Process.starts`, validates clean, and writes a file that cannot load. An answer wakes every reactor in every context that consumes the operation, so `reaction-cycle` reports a ring between two callers of the same service that never wakes each other. The anti-corruption-layer exemption in `relationship-cycle` reads the relationship's roles, so one translated consumption launders every untranslated one. Decision 27 lets a context invariant claim to be true after the operation, which its first amendment says no cross-instance rule can promise. Plus the rule defects listed below.

## Checklist

- [x] Loading never throws on a model mistake: an unresolvable or wrong-kind ref in `on`, `starts`, `ends`, `from`, `by`, `identifies`, `constrains`, `valueobject`, `schema`, `returns`, `rejects` becomes `unresolved-ref` (error) at the referencing element and the rest of the file still validates; the DSL's `Process.starts` is typed to what the schema allows; test each site from JSON
- [x] An answer reaches only the reactor that made the call: a reactor may wait on an operation's answer only when the reactor itself, or an operation it issued, is named in `by` on a consumption of that operation, or when the reactor's context has exactly one consumption of it; the reaction walk steps from the answer to that reactor only; the review's two-caller probe validates with no cycle; decision 23 amended by the lead
- [x] `relationship-cycle` exempts a step by the consumption's own pattern (`anti-corruption-layer` on the consumption), not the relationship's roles; the review's laundering probe now warns
- [x] A context invariant is checked before acting and never claims to hold after: `precondition` is refused on a context invariant (`context-invariant-is-checked`, error) and its page and rule text say "checked by"; NorthBank's `DailyLimit` description stops claiming to be true after `InitiatePayment`; decision 27 amended by the lead
- [x] An identity crossing needs no relationship: the «id» edge on the context map is its record; `relationship-declared` reads consumptions, subscriptions and borrowed value objects only; the fourteen empty-role relationships in the three models come out; decision 14 amended by the lead
- [x] `separate-ways` covers identity and value object crossings as it covers consumptions, with its own error instead of a false `relationship-declared` message
- [x] `external-is-boundary` refuses `internal` operations on an external context (its insides are not ours); NorthBank's `RequestAuthorisation` on CardCo comes out or becomes a public operation of the feed
- [x] `aggregate-tree` refuses `references` to a value object as it refuses `uses` to an entity; `mud-needs-acl` counts an identity into a big ball of mud; an aggregate may not consume another aggregate's operation in its own context (`aggregate-consumes-inside` widened; a service fronts it)
- [x] Rule texts corrected: `subscription-consumed` fix no longer says "or aggregate"; `cross-context-relation` fix says the context map; `invariant-in-aggregate` message admits a precondition's schema attributes; `relationship-roles-backed` fix matches what backs an ACL
- [x] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained; the review's probes P1, P2, P3, P4, P5a to P5c, P7, P16, P17, P18, Q2 rerun and reported

## Gates

- [x] clean-code-swept — swept the diff (26 files, ~2090 lines added) against the eight principles. Two things it changed. `Refs.one`/`Refs.many` took a `(field, expected, lookup, written)` quartet at twenty call sites, where nothing tied the phrase to the lookup and a message could describe a kind different from the one that had been looked up; both now take one `Kind<T>` — `{ what, find }` — declared once per field kind (`A_SCHEMA`, `A_CALLER`, `A_CONSTRAINABLE`, …), so the two travel together, the two dynamic ones (`processTrigger`, `deadlineAnchor`) are the same shape, and the call sites read `refs.one(at, "returns", A_SCHEMA, returnsRef)`. Biome caught the follow-on: three loader functions no longer needed the `workspace` they had been passed, and they no longer take it. And the sentence "an id belonging to X / the identity of Y in X" had been in `relationship-declared` and was about to be in two more rules; it is `identityNamed(crossing)` in `identity-crossings.ts` beside the type it describes, so `separate-ways` and `mud-needs-acl` cannot drift apart on how a crossing is named. Three things it looked at and left. `aggregateTree`'s new branch picks its clause with a ternary rather than a second push, because the two messages differ by one clause and the surrounding shape is already an if-chain. `hearsAnswerOf` and `routesTo` share `callsTo` and answer two different questions — may this reactor wait at all, and which node does the step run from — and merging them would hide that they are different; both say so in their comments. And `Site`/`site()` in the loader is a two-field record with a helper, which is more ceremony than a string pair, but it is what stops the twenty call sites drifting on how an element is named in a message (senior-developer-deep, 2026-09-09T18:30:00Z)
- [x] verify-all — `bash scripts/verify-all.sh` exit 0: core 626, graphviz 27, doc 31, skill 26, northbank 3, petstore 20, rivermart 3, streamline 3, models/_shared 9, pages 757, apps/docs 23, apps/ods-vscode 15, pages e2e passed, petstore schema matches core dist (senior-developer-deep, 2026-09-09T18:35:00Z)

## Comments

- **the lead** (2026-09-09T15:00:00.000Z): senior-developer-deep, after card 99 lands; `feat!`.
- **senior-developer-deep** (2026-09-09T16:40:00.000Z): Picked it up; worktree reset to origin/develop at 551e8db ("card 100 dispatched"), installed. Read the card, the 2026-09-09 amendments and notes on decisions 14, 20, 23 and 27, and decisions 03, 15, 17, 26, 28 for context. Baseline before any change: `northbank: 4`, `petstore: 0`, `rivermart: 2`, `streamline: 4`, all deliberate. Every item reproduced against that baseline first — see the probe block at the end for what each one did before and does now. One item was already true: `Process.starts` is typed `Consumable[]` and `tsc` refuses an `Answer` there (`Argument of type 'Answer' is not assignable to parameter of type 'Consumable'`), which card 99's widening of `starts` must have carried in. What was not true is the JSON half: an answer ref in `starts` threw at load, and now reports `unresolved-ref` naming the wrong kind.
- **senior-developer-deep** (2026-09-09T17:00:00.000Z): The loader. Every `$ref` a file writes now goes through one `Refs` resolver: it looks the ref up, and on a miss leaves the link unset and records `{ ref, owner, field, where, target, expected, present }` on `Workspace.unresolved`, which the new `unresolved-ref` rule turns into one error each. Not only the eleven sites the checklist names — every one in the file, because "loading never throws on a model mistake" is the headline and leaving `consumes.consumable`, `raises`, `then`, `target`, `specialises`, `team`, `subdomains`, `embodiedBy` and the relationship ends able to throw would have left the obvious crashes in. Where a link cannot be left unset the element goes: a consumption whose consumable resolves to nothing is dropped and reported at the consumer, a relationship with an unresolvable end is dropped and reported at the end that did resolve. Three judgements worth the lead's eye. The loader's own lookups for elements it has just created stay on `...OrThrow`, because a miss there is a bug in this file rather than a mistake in the model. `Deadline.countsFrom` and `Process.refuseForeignDeadline` still throw for the DSL, and the loader no longer reaches them with anything they would refuse: `from` resolves through a `Kind` scoped to the triggers that process waits for, and `on`/`ends` through one that refuses another process's deadline, so both come out as `unresolved-ref` saying which kind was wanted. And a bad ref does not round-trip: `toSchema()` writes the link as unset, so saving a file with a typo in it loses the typo. That is the price of "the link is left unset" and I have not tried to keep it; flagged in DECISIONS NEEDED.
- **senior-developer-deep** (2026-09-09T17:20:00.000Z): The answer, and the one place I had to choose. `hearsAnswerOf(reactor, operation)` in `reaction-walk.ts` is the card's disjunction word for word — the reactor issues the operation; or it, or an operation it issues, is named in `by` on a consumption of that operation in its context; or nothing says who calls and there is one consumption to hear — and `consumable-kind` asks it instead of "does this context consume the operation". That alone does not clear the review's ring, and I want to be explicit about why. With the third clause read plainly, two contexts that each call one shared scorer each have exactly one consumption of it, so both still hear every answer, and the walk still steps from `Score` to both reactors: the false ring survives. The only reading that makes the checklist's own outcome true — "the two-caller probe validates with no cycle" — is to draw the answer step from **the call that asked for it** rather than from the operation that answered. So `routesTo(reactor, operation)` names the local operations that carry the call (`by`, or the operation itself where the reactor issues it, or the sole operation of a consumer that writes no `by`), and `ReactionChain` keys its answer steps by those. The probe then gives `Ask Lending -> Lending on verdict` and `Ask Cards -> Cards on verdict` and no ring, and the reader sees the call leave on one arrow and the answer arrive on the next. The cost is visible: the flow map's answer edge moves from `Authorise Payment -> Checkout` to `Request Authorisation -> Checkout`, six derived-map tests changed with it, and the ending-answer edge moved the same way so the map does not say two different things about one answer. If the lead meant the narrowing to be the rule alone, the walk change is the piece to take back out — and the ring comes back with it.
- **senior-developer-deep** (2026-09-09T17:35:00.000Z): The rules the review reproduced. `relationship-cycle` reads the layer on the consumption: `untranslatedCallCrosses` counts a step when at least one operation consumption across it has no `anti-corruption-layer` pattern, and `translatedByAcl` is gone. `callCrosses` stays, unchanged, for `shared-kernel-backed`, which asks a different question — any call at all backs a kernel, translated or not. `context-invariant-is-checked` refuses both flags on a context invariant, not only `precondition`: the checklist names the precondition, and the headline says "never claims to hold after", which is exactly what a postcondition claims; refusing one and allowing the other would have left the sentence the card is correcting writable in one more way. `relationship-declared` loses the identity loop and `separate-ways` gains it, together with the borrowed-value-object crossing that used to come out of `relationship-declared` as a false "no relationship says how these two stand" when one does and it says they do not integrate. `mud-needs-acl` counts an identity into mud and is cleared by the holder already translating something out of that context, which is the repair the message asks for. `aggregate-consumes-inside` refuses an aggregate consuming another aggregate's *operation* in its own context and leaves its events alone, because a fact nobody waits on is not a call. `external-is-boundary` refuses `internal` on an operation only — an internal *event* of an external context is arguably the same invention, and I have not decided that; flagged.
- **senior-developer-deep** (2026-09-09T17:55:00.000Z): The models. NorthBank gains an external `ISO 13616` context owning `IBAN` and its mod-97 invariant; Accounts' copy comes out along with its `uses` relation, which could not cross the boundary anyway, and Payments' `Payee.iban` stops being a bare `string (ISO 13616)` and is typed by the same value. Both contexts declare themselves conformists of a published language, which is the standards-body shape `relationship-roles-backed` learned in card 95: the body provides nothing to consume, and the borrowed shape backs both roles. `DailyLimit` says where the check is made rather than what it guarantees, and the discovery notes say why — the interviews name no reconciliation, so I have not invented one; the description says only that two instructions arriving together can both pass the sum. `RequestAuthorisation` drops `internal`. The fourteen empty-role relationships come out — four in NorthBank, five in RiverMart, five in StreamLine — each replaced by a comment naming which pairs they were, so the next reader does not re-add them; RiverMart's discovery notes said "every cross-context identity has a relationship on the map", which is no longer true, and that sentence is corrected. NorthBank's DISCOVERY.md gains a card-100 revision covering all four changes. The four models' diagnostics are unchanged: `northbank: 4`, `petstore: 0`, `rivermart: 2`, `streamline: 4`, every one a DELIBERATE.
- **senior-developer-deep** (2026-09-09T18:38:00.000Z): `bash scripts/verify-all.sh` green end to end, exit 0. Summary: core 626 tests passed, graphviz 27, doc 31, skill 26, northbank 3, schema comparison (petstore vs core dist) match, petstore 20, rivermart 3, streamline 3, models/_shared 9, pages 757, apps/docs 23, apps/ods-vscode 15, pages e2e (full suite) passed. `npx tsc --noEmit` clean in core, graphviz, doc, skill, pages, all four models, models/_shared, apps/docs and apps/ods-vscode; `npm run check` in pages clean, 939 files, 0 errors, 0 warnings; biome clean on every file I touched. Diagnostics per model, all unchanged from the baseline and every one a DELIBERATE: `petstore: 0`. `rivermart: 2` — `[error] aggregate-root` on Wishlist, `[error] cross-aggregate-reference` on Cart. `northbank: 4` — `[warning] relationship-declared` and `[error] separate-ways` on Branch & Contact Centre consuming Decide, `[error] consumable-kind` on Escalate arrears, `[warning] context-serves-subdomain` on Identity & Access. `streamline: 4` — two `[error] internal-consumable`, `[error] schema-context`, `[warning] policy-complete`.
- **senior-developer-deep** (2026-09-09T18:40:00.000Z): The probes, rerun against this build. The review's own numbering is not in the repository, so each is labelled by the checklist item it belongs to and I have said which; if the mapping is wrong the probes themselves are still the ones the card describes. Every one was reproduced failing on the card-99 baseline first, and the "before" line under each says what it did.

```
## P1 — a JSON workspace with one unresolvable ref, one site at a time
##      (NorthBank's shipped file, each ref broken in turn)
   schema        -> [error] unresolved-ref at #/…/provides/customer_verified   + 4 baseline
   returns       -> [error] unresolved-ref at #/…/provides/get_customer        + 4 baseline
   rejects       -> [error] unresolved-ref at #/…/provides/initiate_payment    + 4 baseline
   by            -> [error] unresolved-ref at #/…/services/onboarding_app      + [warning] consumption-by-required
   consumable    -> [error] unresolved-ref at #/…/services/onboarding_app      + [warning] relationship-roles-backed
   identifies    -> [error] unresolved-ref at #/…/attributes/vendor_match_ref  + 4 baseline
   valueobject   -> [error] unresolved-ref at #/…/attributes/date_of_birth     + [warning] attribute-relation-coherence
   constrains    -> [error] unresolved-ref at #/…/invariants/adult_only        + 4 baseline
   on (policy)   -> [error] unresolved-ref at #/…/policies/note_a_verified_customer + subscription-backed, policy-complete
   starts        -> [error] unresolved-ref at #/…/processes/customer_onboarding + [error] process-starts
   ends          -> [error] unresolved-ref at #/…/processes/customer_onboarding + [warning] process-has-ends
   Before: every one of these threw at load — "Consumable with ref … not found",
   "Schema with ref … not found" — and reported nothing else in the file.
   The knock-on diagnostics are the point: the rest of the file still validates.

## P2 — a deadline's `from` (RiverMart's Checkout)
   naming nothing            -> [error] unresolved-ref … in "from", but nothing in this
                                workspace has that ref
   naming a real trigger the process does not wait for
                             -> [error] unresolved-ref … which is not one of the triggers
                                this process starts or waits on
   Before: both threw out of `Deadline.countsFrom`.

## P3 — a foreign deadline in another process's `on` (RiverMart)
   -> [error] unresolved-ref: Process "Order to delivery" names "#/…/checkout/deadlines/
      authorisation_expiry" in "on", which is not an event, an answer an operation comes
      back with, or one of this process's own deadlines
   Before: threw out of `Process.refuseForeignDeadline`.

## P4 — an answer in `Process.starts`
   DSL: `tsc` refuses it — Argument of type 'Answer' is not assignable to parameter of
        type 'Consumable' (already true on the baseline; card 99 carried it in)
   JSON: the file now loads, with [error] unresolved-ref … in "starts", which is not an
        event, or an operation of this process's own context
   Before: written past the type with @ts-ignore, `toSchema()` produced a file whose load
        threw "Consumable with ref …/returns not found".

## P5 — an answer returns to its caller
   P5a  Lending and Cards each call one shared scorer; Cards records every verdict it
        asked for; Lending starts a scoring call when a card record lands.
        -> reaction-cycle: 0, consumable-kind: 0
        Before: [warning] reaction-cycle — Reactions run in a cycle: "Cards on verdict" ->
        "Record Cards" -> "Cards Recorded" -> "Lending on card record" -> "Ask Lending" ->
        "Score" -> "Cards on verdict" … it runs through "Cards" and "Lending" and "Scoring".
        Nothing in that model triggers anything of the other's.
   P5b  the answer steps the walk draws, same model:
          Ask Cards    -> Cards on verdict
          Ask Lending  -> Lending on verdict
        Before: Score -> Cards on verdict AND Score -> Lending on verdict.
   P5c  the same with no `by` anywhere: reaction-cycle 0, consumable-kind 0, and no answer
        step drawn — each caller provides two operations, so nothing says which one calls
        and the chain stops rather than guessing, which is what consumption-by-required
        already warns about.

## P7 — one translated call must not launder the untranslated ones
   Ordering and Billing call each other twice; each declares an anti-corruption layer on
   the relationship and on one of its two consumptions.
   -> [warning] relationship-cycle: Calls run in a cycle: "Billing" -> "Ordering" ->
      "Billing" …
   control (every consumption translated) -> 0
   Before: 0 in both cases — the relationship's role excused every step.

## P16 — `references` onto a value object
   -> [error] aggregate-tree: "Order" references "Money", which is a value object;
      "references" points at an entity in another aggregate, and a value has no identity
      to point at. A value object is used
   Before: nothing.

## P17 — an identity into a big ball of mud
   -> [warning] mud-needs-acl: "Accounts" holds "Legacy Customer Key", the identity of
      "Customer" in "Sovereign", and "Sovereign" is a big ball of mud; a key from a system
      nobody can read is its model in yours, so take it in behind an anti-corruption layer
      and hold an identity of "Accounts"'s own beside it
   Before: nothing. Cleared once the holder translates something out of that context.

## P18 — an aggregate calling the aggregate next door
   -> [error] aggregate-consumes-inside: Aggregate "Cart" consumes "Reserve" from
      aggregate "Stock" in "Retail"; each is saved in its own transaction, so one calling
      the other spans two of them with nothing on any map to say so. Let a service of
      "Retail" front the call and hand "Cart" what it needs
   Before: nothing. An event from the same aggregate is still accepted.

## Q2 — an external context's insides, and a rule that claims to hold after
   internal operation on an external context
   -> [error] external-is-boundary: External context "Card Scheme" marks operation
      "Settle Internally" internal; whether an operation of a system we do not own stays
      inside it is not ours to state …
   context invariant marked postcondition
   -> [error] context-invariant-is-checked: Invariant "Daily Limit" of bounded context
      "Payments" is marked a postcondition; a rule across the instances of a context is
      always a check … so it neither needs saying nor holds after
   context invariant marked precondition -> the same error, naming the precondition
   Before: nothing in all three cases.

## separate ways, which now says what is actually wrong
   Up and Down declare separate ways; Down holds Up's entity id and types an attribute by
   Up's value object.
   -> [error] separate-ways: "Down" holds "Thing Id", the identity of "Thing" in "Up",
      although the contexts declare separate ways
   -> [error] separate-ways: "Down" types "Holder"'s "Total" by "Money" from "Up" although
      the contexts declare separate ways
   Before: two [warning] relationship-declared saying no relationship says how the two
   stand to each other — when one does, and it says they do not integrate.
```
