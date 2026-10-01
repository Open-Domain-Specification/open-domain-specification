---
status: Accepted
date: 2026-09-06
---
# Decision 19 — An invariant may constrain the operations that guard it

## Current position (2026-09-10)

Status is Accepted (2026-09-10, after thirteen review rounds; it had read Proposed while its rules were errors the models were pinned to). An invariant may name the operations that guard it, and invariants stay prose; stable. The guard may be an operation of the invariant's aggregate (the decision, card 50) or of any service, application or domain, of its own context (amendments of 2026-09-08, cards 90 and 91). A precondition is stated with `precondition: true` and must name the operation it guards (decision 27, card 94); a postcondition with `postcondition: true` (second amendment of 2026-09-09, card 99).

Reach is by flag. A precondition may constrain the request schema and what it composes (cards 97, 99 and 104); the `returns` schemas of consumables consumed by the guarded operation or by its front in the same context (second amendment of 2026-09-10, card 116); and the payload of an event consumed by the policy or process that issues the guarded operation (third amendment of 2026-09-10, card 124); never another context's entities. The amendment of 2026-09-09 (card 97) that let a precondition name what its own operation returns or rejects with no longer holds; see the amendment of 2026-09-10 (card 104). A postcondition reaches the request, the answer and the rejections, through composition (cards 99, 103 and 104). An invariant with neither flag constrains model elements only, not transport shapes (2026-09-09).

Context invariants and external contexts use the same flags (decision 27, card 103; decision 28, cards 107 and 116).

Since the note of 2026-10-01 (card 178), every aggregate or modelled-context invariant names operations as guards, never an event target beside one, whether flagged or unflagged. A precondition may still read the attributes of an already-heard event's payload under the conditions above. An external context's published event-payload postcondition is the separate decision 28 case.

Since the fifth and eighth notes of 2026-10-01, a process contributes a starting event's payload, not an unordered `on`/`ends` fact or a starting operation's later answer. A policy contributes its immediate received event or returned/refused answer as a prior occurrence, regardless of whether a new invocation can produce the same identity. Reach requires the fact on every finite admitted caller route to every named guard; recursive calls retain facts supplied at all real entries, and an unentered internal caller component contributes no route. These are timing and route claims, not proof that a reaction bootstraps or avoids a cycle.

## Context

`InvariantSchema.constrains` names entities, value objects and attributes (decision 05). Many invariants are transition rules: petstore's `SoldNotReopen` ("once sold, a pet does not revert to available") is about what `ChangePetStatus` may do, and today it can only point at the status attribute.

Since the ninth note of 2026-10-01, an unattributed local consumption is a conservative empty held-fact entry to the called operation, even beside a known caller or issuing reactor. Missing caller identity removes no declared invocation route.

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

## Note (2026-10-01)

`precondition-names-operation` used to stop asking once it found any operation, so a rule could name a local event beside it and all readers called that event an operation checked before execution. The same mixed target was also accepted on a modelled postcondition and an unflagged rule. An event is not another call guard, so `invariant-guards-are-operations` now refuses event targets on every modelled aggregate or context invariant, even when an operation is present (issue #128, card 178). This does not narrow the third amendment's already-heard payload attributes, and decision 28 still allows an external context to guarantee its own published event's payload.

## Note (2026-10-01, second)

The second amendment admits an answer a front fetched before the guard ran; it never admits the guarded operation's own answer. The validator counted the front's consumption of that very guard as a fetched fact, so adding a front made a precondition on a future answer valid. That consumption is now excluded by operation identity from fetched facts. A different earlier call returning the same schema still supplies a fact the precondition may read (issue #131, card 181). The reach follows when the fact exists, rather than excluding a shape globally.

## Note (2026-10-01, third)

The second note's identity exclusion was too narrow when the same invariant also named the front: the front's reading of the guarded call reintroduced the future answer. A precondition may name a front and its guarded operation together, but neither named operation lends its own future answer or event; a distinct earlier query returning the same schema still can. The facts held by an outer front follow the local `by` chain to an inner guard, as the reaction walk does, stopping at the context boundary or an ambiguous caller. For a process, `starts` and `on` can be facts it has heard; `ends` completes it and supplies no fact before the command it issued. An event the guarded call chain raises is likewise future, even if the same process names it in `on` (issue #131, card 181). The model still does not specify a total order among arbitrary calls; these exclusions state what the causal links prove.

## Note (2026-10-01, fourth)

The third note covered depth but omitted alternative routes. When two independent fronts call the same guarded operation, an answer fetched on only one route cannot make its precondition true on the other. The same holds when a policy may wake on either of two events or a process may start on either of two events: a payload from one alternative does not supply the other. A precondition may constrain a held fact only when every modelled route to the guard holds that fact. Sequential local fronts retain facts already held on their chain; a process's subscribed `on` facts remain available after it has heard them. The validator now checks these routes separately and intersects their reachable shapes (issue #131, card 181).

## Note (2026-10-01, fifth)

The fourth note's last sentence could be read as granting every process `on` payload to every command it issues. Decision 23 says a process remembers what arrived but leaves when it decides to issue each command to code. The model does not prove that an `on` event, including an answer trigger, has arrived before a particular command runs. A process start event has arrived when the process begins and may supply its payload; a later answer to an operation that started the process has no guaranteed delivery time before another issued command. Each named guarded operation and each public direct, local caller, policy trigger or process-start route must carry a claimed precondition fact. A process may describe a more specific wait in prose, but that does not make the validator assert an order the model cannot prove (issue #131, card 181).

A policy's `on` event or answer is its immediate trigger, so that trigger's payload is already present when the policy issues a command, provided the fact exists on every alternative policy trigger route. An answer or event produced only by that very guarded call or its local front remains future even if the same shape appears in an `on` list.

This also narrows the second amendment's suggestion to name a fetching operation beside a transition. Naming both operations does not say that one called the other or that its answer arrived first. A local `by` chain must establish that causal route, and the fact must be available at both named checks if both operations remain guards of the same invariant. The older independent `Check Standing` plus `Approve` example is not proof of precondition reach merely because both names appear in the target list.

## Note (2026-10-01, sixth)

An invariant that names several operations makes its timed claim at each one; the target list does not assert a sequence or a joint call. For a precondition, a request or already-held fact must be reachable at every named operation and on every possible route to each. For a postcondition, a request, returned or refused shape must be reachable at every named operation whose result the invariant claims to guarantee. Composition is expanded before intersecting those reachable shapes: a guard holding an `Envelope` that contains `Fact` and another holding `Fact` directly can both constrain `Fact.result`. Intersecting only the outer schema names would wrongly refuse that shared fact (issue #131, card 181).

## Note (2026-10-01, seventh)

The fifth note's future-event exclusion is local to an invocation route. If an operation raises `Observed`, that operation cannot borrow the event before raising it; a policy that later receives `Observed` has the payload as its immediate trigger before it issues a guarded operation, even when the earlier publisher is also an independent caller of that guard. Treating `Observed` as future everywhere because one caller raises it erases a fact the policy demonstrably holds. Each route must be checked at its own call time (issue #131, card 181; sixteenth signoff review).

## Note (2026-10-01, eighth)

Fact reach distinguishes an invocation from the operation's identity. An immediate policy event or returned/refused answer has already arrived from a completed prior occurrence before the policy issues its command. It remains held even if a newly issued call, another local caller or another named guard can produce the same event or answer identity. The fifth note's future-fact exclusion applies to the result of the invocation currently being checked, not to a received policy trigger. This analysis treats the policy's declared trigger as a conditional entry and does not prove that a first trigger can occur. Reaction-cycle detection remains a separate diagnostic.

Local caller facts are the intersection over every finite call walk from an admitted entry to the guard. Recursion does not erase a fact held at every real entry: `Entry → Evaluate → Evaluate` retains the fact that Entry fetched, while an uninformed independent entry still makes that claim fail. Public direct invocations and conservative orphan invocations are empty held-fact entries; policy triggers and process starting events contribute their received payloads. An internal caller component with no admitted entry contributes no finite invocation route. A guard with no reachable entry has no held facts, rather than gaining all facts vacuously. The validator first establishes entry reachability, then computes the greatest fixed point of must-facts on reachable callers; it does not enumerate recursive paths (issue #131, card 181; seventeenth signoff review and bounded architecture assessment).

## Note (2026-10-01, ninth)

A consumption declares a call even when its particular calling operation is unknown. Decision 21 infers a sole operation and otherwise leaves the caller unattributed; a big-ball-of-mud consumer is allowed to leave it so. In neither case may fact reach erase that consumption. An unattributed local call contributes an independent empty held-fact entry to its target, including where an informed named caller or reactor also reaches that target. The current invocation's request and eligible facts fetched by the target remain available as before, but another route's fetched or received fact cannot be lent to the unknown call. The reaction walk continues to follow known caller identities only; conservative invariant reach does not invent a causal edge. The same entry accounting applies at each predecessor on a local call chain (issue #131, card 181; eighteenth signoff review).

The conservative adapter also refuses to credit held facts to a `by` entry naming a different provider's operation, an event or a reactor. Valid caller names alongside invalid ones retain their known routes, and the unattributed part contributes an empty entry. A foreign consumer or reactor contributes no local held payload. These models retain their existing caller, internal-consumable or reactor-context diagnostics; an additional invariant-reach error is allowed and does not legalise their routes. The reaction walk and single-operation inference are unchanged. A public operation already has an empty direct entry, while a valid foreign call cannot enter an internal operation.
