# 20. A cycle is a ring of calls

Date: 2026-09-07

## Status

Accepted

## Current position (2026-09-10)

`relationship-cycle` walks only steps where an operation of the upstream is consumed by the downstream; event steps are `reaction-cycle`'s; a mutual pair of calls is reported. Stable, with three narrowings: a step whose consumption declares an anti-corruption layer toward that upstream does not count, read per consumption (amendment of 2026-09-08, card 82; note of 2026-09-09, card 100); a declared partnership clears a ring that is nothing but the pair, not a longer ring the pair is part of (note of 2026-09-10, card 104; decision 03's correction); and a ring both `reaction-cycle` and `relationship-cycle` see is reported once, as calls (note of 2026-09-10, card 108).

The decision's sentence that `partnership-backed` was specified as traffic both ways no longer holds; see the second amendment of 2026-09-07 (cards 63 and 69): traffic in at least one direction. The message no longer claims a runtime wait (amendment of 2026-09-07, card 49) and offers an ACL, a partnership or an event as repairs (card 82).

The context's reliance on "delivery fixed by type" is qualified: decision 15's second amendment of 2026-09-10 (card 120) says type is kind, not delivery, most operations are awaited and this rule assumes so, and a queued command on a ring is answered by an ACL, a comment, or modelling it as the event it is (note of 2026-09-09, card 100). The lifecycle exemptions on `reaction-cycle` are decision 23's.

## Context

Card 53 added `relationship-cycle`, a warning for directed relationships that run in a ring. Written over every directed relationship it found eleven rings in the reference models, most of them a pair of contexts each upstream of the other in one respect and downstream in another. That shape is common and not wrong: Ordering publishes events that Fulfilment reacts to, and Fulfilment offers a query Ordering calls. Nobody on that ring waits for anyone; the events arrive when they arrive.

Decision 15 already fixes delivery by type: an operation is a call, an event is a subscription. The cost of a ring is not a runtime deadlock; two contexts can each expose a query the other calls and no request ever waits on itself. The cost is to the models: an upstream-downstream relationship says the downstream team shapes its model around the upstream's, and a ring of those says every team on it shapes its model around a model that is shaped around its own. Nobody on the ring can change first. A call binds the caller to the callee's contract at the moment of the call, which is why calls count; an event subscription binds more loosely and its ring is a different fault.

## Decision

`relationship-cycle` walks only the steps where an operation of the upstream context is consumed by the downstream one. A step backed only by events or by a policy subscribing to the other side's event is choreography and does not count; `reaction-cycle` covers rings of those separately, because a loop of reactions is a different fault with a different fix. A mutual pair of calls is a ring of two and is reported.

`partnership-backed` was specified as traffic both ways; see the second amendment. Where a reference model declared a partnership with traffic one way, the model's own prose decides the fix. If its description or comments say the quiet direction exists, the model gains the consumption it already describes; if they do not, the relationship is demoted to customer-supplier with the roles the existing traffic implies.

## Consequences

A ring of contexts joined by events validates clean, as it should. A ring of calls is a warning that says the contexts on it are mutually dependent, and the message offers both honest repairs: name the dependency a partnership, which is what DDD calls two contexts that succeed or fail together, or reverse one dependency by turning a call into an event. Neither is prescribed; a pair of synchronous queries each way may well be a partnership, and the rule's job is to make the author say so. Reference models fix their rings that way, and RiverMart, which plants problems on purpose, may keep one ring of calls as a deliberate finding recorded in its discovery notes.

## Amendment (2026-09-07)

The first wording of the rule's message claimed each context waits on the next to answer. That is a runtime claim the model cannot make and the sixth review run rightly objected. The message now speaks of models shaped around each other and offers the partnership as the first repair (card 49 carries the rewording).

## Amendment (2026-09-07, second)

The architect review read Evans back to the rule: a partnership is two teams whose success depends on each other, a joint release train, and that does not require consumption in both directions. RiverMart's and StreamLine's one-way partnerships were truthful and the rule over-claimed. `partnership-backed` now requires traffic in at least one direction, because a partnership with no exchange at all is a wish, and its text says why the other direction is not demanded (card 63 keeps the models; the rule change lands with card 69).

## Amendment (2026-09-08)

Codex's review made the remaining overreach plain: two contexts that call each other through anti-corruption layers evolve independently, and telling them they cannot change first is false. A step whose downstream declares an anti-corruption layer toward that upstream does not count toward a ring (card 82), and the message says only what the model can: the contexts depend on each other's contracts, and the repairs are an ACL, a partnership, or an event.

## Note (2026-09-09)

The premise that a call binds the caller at the moment of the call fails for a queued command, which decision 15 keeps as an operation with a comment. Two fire-and-forget commands each way therefore read as a ring of calls. The cost is named: an author with a queued command on a ring either declares the anti-corruption layer that translates it, marks the ring's disposition with a comment, or models the command as the event it really is. And the anti-corruption exemption is read per consumption, not per relationship, so one translated call does not excuse the untranslated ones (card 100).

## Note (2026-09-10)

A declared partnership clears a ring that is nothing but the partnered pair, because the two move as one; it does not clear a longer ring the pair is only part of, since the pair together still depends on the third context (card 104). The fix text says exactly that now.

## Note (2026-09-10)

`reaction-cycle` words a ring of single-operation services calling each other as reactions that trigger themselves, and `relationship-cycle` reports the same ring across contexts. The ring is real and the claim is recursion, so the message says calls, and the ring is reported once (card 108, architect's eighth round).

## Note (2026-09-10, second)

The context above says decision 15 fixes delivery by type; decision 15's second amendment of 2026-09-10 withdrew that: type is kind, not delivery. This rule still assumes a call binds at the moment of the call, which is true of most operations, and a queued command that trips it says so in the consumption's comment.
