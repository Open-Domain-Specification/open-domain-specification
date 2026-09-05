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
