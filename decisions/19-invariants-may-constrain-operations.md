---
status: Proposed
date: 2026-09-06
---
# Decision 19 — An invariant may constrain the operations that guard it

## Current position (2026-09-10)

Status is Proposed. An invariant may name the operations that guard it, and invariants stay prose; stable. The guard may be an operation of the invariant's aggregate (the decision, card 50) or of any service, application or domain, of its own context (amendments of 2026-09-08, cards 90 and 91). A precondition is stated with `precondition: true` and must name the operation it guards (decision 27, card 94); a postcondition with `postcondition: true` (second amendment of 2026-09-09, card 99).

Reach is by flag. A precondition may constrain the request schema and what it composes (cards 97, 99 and 104); the `returns` schemas of consumables consumed by the guarded operation or by its front in the same context (second amendment of 2026-09-10, card 116); and the payload of an event consumed by the policy or process that issues the guarded operation (third amendment of 2026-09-10, card 124); never another context's entities. The amendment of 2026-09-09 (card 97) that let a precondition name what its own operation returns or rejects with no longer holds; see the amendment of 2026-09-10 (card 104). A postcondition reaches the request, the answer and the rejections, through composition (cards 99, 103 and 104). An invariant with neither flag constrains model elements only, not transport shapes (2026-09-09).

Context invariants and external contexts use the same flags (decision 27, card 103; decision 28, cards 107 and 116).

## Context

`InvariantSchema.constrains` names entities, value objects and attributes (decision 05). Many invariants are transition rules: petstore's `SoldNotReopen` ("once sold, a pet does not revert to available") is about what `ChangePetStatus` may do, and today it can only point at the status attribute.

## Decision

- `constrains` may also name a consumable of the same aggregate. The invariant then reads as the rule that operation must uphold.
- Invariants stay prose; no expression language (decision 15).

## Consequences

- The `invariant-in-aggregate` rule (card 50 kept the existing id rather than add a second rule) accepts consumables of the invariant's aggregate; the invariant page lists them under "Guarded by"; the consumable page lists its invariants; the doc generator follows; petstore's `SoldNotReopen` names `ChangePetStatus`.

## Amendment (2026-09-08)

An invariant may also name an operation of an application service of its own context when that operation is the guard: a funds check at initiation, an entitlement check at playback start. Decision 17 put the public operation on the service, so the guard often lives there and the invariant must be able to point at it (card 90). The five precondition invariants in the reference models that carried their guard in prose now name it.

## Amendment (2026-09-08, second)

The guard may be an operation of any service of the invariant's own context, domain or application. A rule that reads two aggregates before acting lives in a domain service, and refusing it as a guard sent the model back to prose (card 91).

## Amendment (2026-09-09)

A precondition checks the request before the operation runs, and often what it checks is in the request: pickup before delivery, a positive weight, on a quotation no aggregate yet holds. A precondition may constrain attributes of the schema its guarded operation takes, returns or rejects with (card 97); an invariant that is not a precondition still may not, because a persistent rule about the model is not a rule about a transport shape.

## Amendment (2026-09-09, second)

A guarantee about an answer is a postcondition: every returned itinerary meets the requested deadline. It is neither a persistent invariant nor a precondition, since the answer does not exist before the operation runs. `postcondition: true` names it and lets it constrain the attributes of what the guarded operation returns or rejects with; and both preconditions and postconditions follow schema composition, reaching a field of any schema the request or answer composes (card 99).

## Amendment (2026-09-09, third)

A postcondition relates the answer to the request: every returned itinerary arrives by the requested time. Its admissible targets therefore include the request schema and what it composes, as a precondition's do (card 103); the second amendment's own example needed this and its implementation left it out.

## Amendment (2026-09-10)

A precondition reaches the request and what it composes, and nothing else, because it is checked before the answer exists; a postcondition reaches the request, the answer and the rejections (card 104). The earlier wording that let a precondition name what an operation returns was incoherent and is withdrawn.

## Amendment (2026-09-10, second)

The 2026-09-10 amendment fixed a precondition's reach to the request and what it composes, reasoning that before the call runs there is no answer to read. That is true of the guarded operation's own answer and false of the answer its front fetched before deciding: "approve only if the customer is in good standing" reads a standing the front already holds, and the guard could name neither the other context's attribute nor that answer. A precondition may also constrain attributes of the `returns` schemas of consumables consumed by the guarded operation or by the front that calls it in the same context; still never another context's entities (card 116, architect's tenth round).

## Amendment (2026-09-10, third)

The second amendment let a precondition reach what the guard or its front fetched, "a fact we hold, in the shape it came in", and the same words apply to the payload of an event the reactor heard before issuing the guarded operation: "ship only when the captured amount covers the order total" reads `PaymentCaptured.amount`, which the context holds through its subscription, and the model asked for the amount to be copied into the request so a rule could point at it. A precondition may constrain attributes of the payload schema of an event consumed by the policy or process that issues the guarded operation, in the same context; still never another context's entities (card 124, architect's eleventh round).
