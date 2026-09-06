# 28. The outside world is an external context

Date: 2026-09-07

## Status

Accepted

## Context

Every provider in the model is an aggregate or service inside a bounded context that serves a subdomain and has a team. The systems a business integrates with, a card scheme, a payment provider, a licensor, a regulator, a clock, are none of those things, and the reference models leave them out or dress them up: NorthBank's shared library became a context with an invented subdomain and team to satisfy `context-serves-subdomain`. An event that no operation raises, ingested telemetry or a timeout, validates clean and reads as dead model; decision 15 claimed a rule asked about it and none did. DDD's context map has always drawn the outside world as contexts one does not own.

## Decision

- `BoundedContextSchema.external?: boolean`. An external context is a system the enterprise does not own or model inside: it may provide consumables and consume them, it takes part in relationships (it is the classic upstream of a conformist or the target of an anti-corruption layer), and it needs no subdomain, no team, and no aggregates. `context-serves-subdomain`, `team` assertions and every rule about internals skip it; `external-is-boundary` (error) refuses aggregates, policies, processes and invariants on it, because its internals are not ours to state.
- Time is an external context when the model needs it: a `Clock` that raises `DayEnded` or `MonthClosed` is honest, and a process that ends on a deadline names that event.
- `event-unraised` (warning): an event that no operation of its own context raises, unless the context is external. The fix text says: name the operation that raises it, or say the event comes from outside by marking the context external.
- Human actors are not modelled. An operation people call through a user interface is simply an operation nobody in the model consumes; no rule treats that as dead, because most of a system's public surface is exactly that. The interview asks who calls it and records the answer in the description.

## Consequences

- Schema, workspace model, DSL (`addBoundedContext(name, { external: true })`), JSON schema; `feat!`. NorthBank's kernel context stays a real context (a shared library is inside the enterprise); NorthBank gains external contexts for the card scheme and the sanctions provider, RiverMart for its payment provider, StreamLine for its licensors, where the discovery notes already name them.
- Context map draws an external context with a distinct stereotype; pages and the tree show it; the doc generator and skill follow.

## Amendment (2026-09-08)

An external context has no entities, so an identity attribute names the context itself when the id belongs to that system (decision 14, amended). A conformist downstream of an external upstream may borrow its schemas, which is how a regulator's message formats or a scheme's record layouts enter a model without pretending they are ours (card 81).

## Note (2026-09-08, second)

An internal schedule is not a special trigger: a scheduler calls an operation, `RunNightlyBatch`, and that operation raises the event, which is how the reference models write their batch jobs. Telemetry from a fleet of devices comes from an external context, because the devices are outside the software, and that is a true statement rather than a workaround; the ingestion service that receives it is the context's own application service. A reviewer calling either a synthetic proxy is asking the model to say that events appear from nowhere, which it will not.

## Amendment (2026-09-08, second)

A legacy system the enterprise owns but cannot read is not external, and this record's own argument, that stating a system's insides is invention, applied to it too: three reference models invented a nightly batch service so an event had a raiser. A `bigBallOfMud` context is exempt from `event-unraised`, `aggregate-root` and `root-identity` as an external one is (card 90); it may state what it emits without stating how. An external context states no rules of its own: `external-is-boundary` refuses value object invariants on it too.

## Amendment (2026-09-08, third)

An external context states no aggregates, policies, processes or context invariants, because its insides are not ours. Its value objects are different: an IBAN's checksum, an ISO 20022 field rule, a scheme's record layout are the standard's published contract, known and citable, and a value object of an external context may carry them as invariants that the validator checks like any other (card 91). The second amendment's blanket refusal was too wide.

## Amendment (2026-09-09)

A standards body is a published language: its schemas are what a conformist borrows, and it provides nothing to consume. `relationship-roles-backed` now backs an upstream published-language role by a borrowed schema or value object as well as by a schema-carrying consumption (card 95), so FHIR or ISO 20022 declared as an external upstream validates clean with the one role that describes it.

## Amendment (2026-09-10)

The third amendment let an external value object carry the standard's published constraints and stopped short of the same for an operation. A published operation contract, capture requires a capturable payment and returns the captured one, is as citable as a checksum, and the merchant cannot be the one to promise it. An external context may state a context invariant flagged `precondition` or `postcondition` on its own operation; what stays refused is an invariant with neither flag, which is a claim about the inside, and one that names another context's operation (card 107, Codex's eighth review).

## Amendment (2026-09-10, second)

Two rules still asked for the inside of a system this record says is not ours. `consumption-by-required` asked an external consumer with several operations which of them makes the call, and the fix text told the author to name one, which is the invention card 105 removed from NorthBank; an external consumer, and a big ball of mud for the same reason, is not asked. `mud-needs-acl` read an identity attribute naming a mud context as if it were traffic and cleared it on any anti-corruption consumption from the mud, so a context holding a legacy key it received through a third context could only silence the warning by inventing a consumption; the rule reads consumptions, and a held key is not one (cards 107 and 108, architect's eighth round). The third amendment supersedes the second's refusal of value-object invariants on an external context, which it did not say outright.

## Note (2026-09-10)

Card 107 gave RiverMart's legacy purchasing context, a big ball of mud, a gateway service with the one operation the warehouse calls every morning, next to card 90's deletion of a nightly-export service from the same context. Both hold: an operation of a mud context that another context calls is its boundary, known because we reach it, the same reasoning this record applies to an external context's operations; a service invented so an event has a raiser is a mechanism nobody could describe. The mud says what it offers and what it takes, and nothing about how.

## Amendment (2026-09-10, third)

An identity attribute into an external context named the context itself because the context has no entities. That was less than the context publishes: a processor documents Customer, Payment, Refund and Dispute as distinct kinds with distinct ids, and those kinds are its published schemas, which an external context may declare. An identity may name a schema of an external context, and the model reads it as an identity into that context naming that kind; the context itself remains the target where no schema is published. Aggregates, policies and processes stay refused: a published shape is knowledge, a lifecycle inside their machine is invention (card 113, Codex's ninth review).

## Amendment (2026-09-10, fourth)

The third amendment let an external context state a precondition or postcondition on its own operation and the rule implemented half of it: a flagged external invariant could name no operation at all, and could constrain a modelled context's entity, because every reach rule iterates modelled contexts only. An external invariant must be flagged, must name one of the context's own operations, and may constrain only that operation's request and answer schemas and the context's own value objects; anything else is refused. And `domain-service-internal` read an external context's service type, so an external context that wrote `domain` was invalid twice; the type is not read on an external context, which offers what it offers (card 116, architect's tenth round).

## Note (2026-09-10, second)

The bullet "Human actors are not modelled ... the interview asks who calls it" claimed a practice the playbook did not have; the section moves to decision 15 and card 120 adds the question. And `external-is-boundary`'s message still sent an author away from the route the third amendment opened: a kind an external system publishes is a schema of that context, which `identifies` may name; the message and the definition of a schema say so (card 120).
