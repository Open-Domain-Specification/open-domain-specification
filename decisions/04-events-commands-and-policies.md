---
status: Accepted
date: 2026-09-02
---
# Decision 04 — Domain events, commands and policies are first-class aggregate members

## Current position (2026-09-10)

The decision bullets on `AggregateSchema.events`, `AggregateSchema.commands`, `DomainEventSchema`, `CommandSchema` and the `event` and `command` back-links no longer hold; decision 09 removed them, and a consumable typed `event` or `operation` is the only behaviour construct, with payloads in the context's schemas block. The consequence that aggregate pages gain Commands and Events sections is superseded with them.

Policies stand, as decision 09 said they would, with `on` naming event consumables and `then` naming operation consumables. What has moved since: `then` names operations of the policy's own context only, and `on` reaches another context's event only through a consumption (decision 17, `policy-in-context`; `subscription-consumed` since its amendment of 2026-09-08, card 90); `on` may also name an answer of an operation, `<op>/returns` or `<op>/rejects/<schema>` (decision 23, cards 92 and 94). A policy is stateless and any-of; anything that waits on more than one event is a process (decisions 15 and 23).

The bullet that event and command attributes share `AttributeSchema` holds for schemas (decision 09); the ref forms `.../events/<id>` and `.../commands/<id>` are gone with the objects.

## Context

Events existed only as a `type: "event"` flag on a consumable, so an event
had no payload, could not be internal to a context, and was not tied to the
command that raised it. Nothing captured what causes state change, and
cross-aggregate reactions ("when OrderPlaced then ReserveStock") could not be
expressed. See board cards 03, 04 and 11.

## Decision

- `AggregateSchema.events` holds `DomainEventSchema` entries (name,
  description, optional `attributes`).
- `AggregateSchema.commands` holds `CommandSchema` entries (name,
  description, optional `attributes`, and `raises: { $ref }[]` pointing at
  the events the command may raise).
- Both are referenceable: `#/boundedcontexts/<bc>/aggregates/<agg>/events/<id>`
  and `.../commands/<id>`.
- A consumable of type `event` may carry `event: { $ref }` to say which domain
  event it publishes; a consumable of type `operation` may carry
  `command: { $ref }` to say which command it exposes. Consumables therefore
  remain the *integration* surface while events and commands are the
  *tactical* model.
- `BoundedContextSchema.policies` holds `PolicySchema` entries: `on` is a list
  of event refs, `then` a list of command refs. Policies are context-level
  because they coordinate across aggregates.
- Attributes on events and commands share the `AttributeSchema` used by
  entities and value objects (decision 05).

## Consequences

- Additive schema change; existing documents remain valid.
- The aggregate page and docs gain Commands and Events sections; the context
  page gains a Policies section and a flow map (event → policy → command).
