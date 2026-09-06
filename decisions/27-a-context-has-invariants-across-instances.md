# 27. A context has invariants across instances

Date: 2026-09-07

## Status

Accepted

## Context

Decision 15 said a rule that spans aggregates is not an invariant but a domain service's operation. The four reference models disagree with it in eleven places: one open application per customer, one active offer per seller and SKU, a daily transfer limit, a stream limit per household are all written as aggregate invariants with prose admitting "one instance cannot see another" and NorthBank's discovery notes say "ODS has no other place for a rule the business states". The `invariant-in-aggregate` rule's own text says an invariant holds every time its aggregate is saved, which is false for every one of those. The specification gave two answers and the exemplars chose the one the rules forbid, because a business rule with a name and a sentence is an invariant to the people who state it, whatever a transaction can promise.

## Decision

- An invariant belongs either to an aggregate or to a bounded context. `BoundedContextSchema.invariants` joins `AggregateSchema.invariants` with the same `InvariantSchema`.
- An aggregate's invariant holds inside the aggregate's boundary on every save; it constrains its own entities, attributes, value objects of the context and its own operations (decision 19). `invariant-in-aggregate` keeps that meaning and its text says exactly that.
- A context's invariant holds across instances or across aggregates of that context: uniqueness, quotas, limits, conservation. It constrains entities and attributes of any aggregate in the context, and it must name at least one operation of the context that guards it, because such a rule is kept true only by whoever checks it before acting. `context-invariant-guarded` (error) enforces the guard; `invariant-in-context` (error) keeps its targets inside the context.
- Nothing crosses a context. A rule across contexts is a policy or a process reacting to the other context's events (decisions 15, 23).

## Consequences

- Schema, workspace model, DSL (`bc.addInvariant(...)`), `toSchema`/`fromSchema`, JSON schema; `feat!`. The eleven cross-instance invariants in the reference models move to their contexts and name their guards.
- Context page gains an Invariants section in the aggregate page's shape; the invariant page says which kind it is; the doc generator and the skill follow; the interview asks "is this true of one of these, or of all of them together?".
- Decision 15's "a rule that spans aggregates is not an invariant" section is replaced by a pointer here.

## Note (2026-09-07)

Card 68 found five cross-instance rules in the reference models, not the eleven this record guessed. The other six, an order approved only while its pet is available, a session started only with an entitlement, a payment initiated only within the available balance, are rules checked against another context's data before acting. They are preconditions of an operation, held at the moment of the call and named by the aggregate invariant that constrains that operation (decision 19), and they stay where they are. A context invariant is the rule no single instance can keep.

## Amendment (2026-09-08)

Three kinds, each named on the invariant's page. A value object's invariant holds by construction and constrains only the value's own attributes; a Money's same-currency rule or an IBAN's checksum lives on the value, not on whichever aggregate first held it (card 82). An aggregate's invariant holds on every save inside its boundary. A context's invariant is checked before acting by the operation that guards it, and the model says so plainly: a check can race, and a reader who needs an atomic reservation models it as an aggregate. An obligation across contexts, every captured payment eventually posted to the ledger, is a process whose end is the obligation met; the model states the mechanism, not a guarantee it cannot keep.

## Note (2026-09-08, second)

An invariant's boundary holds instances, not type definitions. A value object borrowed from a shared kernel or a conformed-to upstream is inside the aggregate that holds it, and the aggregate's invariant may constrain that value and its attributes; what it may not constrain is a value nobody inside the boundary holds (card 89).

## Note (2026-09-08, third)

An aggregate invariant that constrains an operation is a guard, a precondition checked when that operation runs; it is not true again after every save, and the rule's text and the invariant's page say which of the two an invariant is by whether it names a guard (card 92).

## Amendment (2026-09-08)

The third note inferred a precondition from an invariant naming an operation, and that conflated two facts: what kind of rule it is, and which operation keeps it. `PostEntry` must produce balanced postings and the rule stays true afterwards; the operation is named for responsibility, not to weaken the rule. A precondition is stated with `precondition: true` and must name the operation it guards; an invariant that names an operation without the flag is kept by it and holds after it (card 94).

## Amendment (2026-09-09, second)

The first amendment said a context invariant is checked before acting and can race; the card 94 amendment then let one be written as kept true after its operation, and NorthBank's daily limit claimed exactly that. A context invariant is always a check: `precondition` is refused on it, its page says "checked by", and a rule that must hold after every change is an aggregate's or nobody's (card 100).

## Amendment (2026-09-09, third)

The second amendment refused `precondition` and `postcondition` on a context invariant to stop one claiming to hold at rest, and in doing so left a context with no aggregate, a quotation service that stores nothing, without a home for the contract of its own operation. A context invariant is a check, and a check happens before or after the operation it names: both flags are allowed, the page says "checked before" or "checked after", and what stays refused is a context invariant that names no guard at all (card 103).

## Note (2026-09-10)

Card 103 merged `context-invariant-guarded` into `context-invariant-is-checked`: one rule says a context invariant without a flag must name its guard, and the flagged ones are checked by the two names-operation rules. Where this record names `context-invariant-guarded`, read the surviving id.

## Amendment (2026-09-10)

A value object's invariant may constrain only its own and inherited attributes, which kept it from reaching unrelated objects and also from reaching the values its own attributes hold: an itinerary whose legs are a `Leg` value object cannot say that each arrival precedes the next departure. The reach is through composition: an invariant on a value object may name attributes reachable through its own attributes' types, transitively through value objects, and nothing outside that path (card 113, Codex's ninth review).
