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
