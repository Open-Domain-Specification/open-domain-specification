# 20. A cycle is a ring of calls

Date: 2026-09-07

## Status

Accepted

## Context

Card 53 added `relationship-cycle`, a warning for directed relationships that run in a ring. Written over every directed relationship it found eleven rings in the reference models, most of them a pair of contexts each upstream of the other in one respect and downstream in another. That shape is common and not wrong: Ordering publishes events that Fulfilment reacts to, and Fulfilment offers a query Ordering calls. Nobody on that ring waits for anyone; the events arrive when they arrive.

Decision 15 already fixes delivery by type: an operation is a call, an event is a subscription. The thing a ring of dependencies actually costs a team is the call that cannot complete until the other side answers, and a ring of those is a ring of teams each blocked on the next.

## Decision

`relationship-cycle` walks only the steps where an operation of the upstream context is consumed by the downstream one. A step backed only by events or by a policy subscribing to the other side's event is choreography and does not count; `reaction-cycle` covers rings of those separately, because a loop of reactions is a different fault with a different fix. A mutual pair of calls is a ring of two and is reported.

`partnership-backed` stays as specified: traffic both ways. Where a reference model declared a partnership with traffic one way, the model's own prose decides the fix. If its description or comments say the quiet direction exists, the model gains the consumption it already describes; if they do not, the relationship is demoted to customer-supplier with the roles the existing traffic implies.

## Consequences

A ring of contexts joined by events validates clean, as it should. A ring of calls is a warning, and the usual repair is what DDD recommends anyway: turn one call on the ring into an event. Reference models fix their rings that way, and RiverMart, which plants problems on purpose, may keep one ring of calls as a deliberate finding recorded in its discovery notes.
