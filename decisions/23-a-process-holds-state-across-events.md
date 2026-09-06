# 23. A process holds state across events

Date: 2026-09-07

## Status

Accepted (2026-09-07; the architect review raised no objection and the reasoning stands)

## Context

Decision 15 kept policies stateless: `on` is any-of, correlation is a process not a policy, and a real process "is modelled as an aggregate with internal operations". Every review run since asked for sagas and process managers, and the honest answer is that the aggregate workaround lies: an order fulfilment process that waits for payment, reservation and a carrier booking before it ships is not an aggregate, because it holds no invariant of its own; it is a thing that remembers which events have arrived and acts when enough have. DDD has a name for it, the process manager, and every event-driven system of any size has several. A model that cannot name them shows a reader a chain of policies and leaves the process, the thing the business actually talks about, unwritten.

## Decision

- `ProcessSchema` under a bounded context, beside policies: `name`, `description`, `starts: { $ref }[]` (an event that begins an instance), `on: { $ref }[]` (further events it waits for or reacts to during its life), `then: { $ref }[]` (operations of its own context it issues), `ends: { $ref }[]` (events that complete an instance), plus `comments` and `disposition` like every other intent.
- A process is stateful by definition: it remembers which of its events have arrived. What it correlates on, its deadlines and its compensations are prose in its description, not fields, for decision 15's reason: the model says that a process exists and what it listens to and does; how it decides is the code's.
- `process-in-context` (error): `then` names operations of the process's own context; `starts`, `on` and `ends` may name another context's events only through a consumption, exactly as `policy-in-context` reads `PolicySchema.on`. `process-has-ends` (warning): a process with no `ends` is a policy wearing a longer name, or has forgotten how it finishes. `process-starts` (error): at least one starting event.
- `reaction-cycle` walks processes as it walks policies. A process that ends on an event its own `then` operations raise is the normal shape and not a cycle by itself.
- A policy stays what it is: stateless, any-of, one reaction. An author who finds a policy waiting for two things promotes it to a process.

## Consequences

- Schema, workspace model, DSL (`bc.addProcess(name, { starts, on, issues, ends })`), `toSchema`/`fromSchema`, JSON schema; `feat!`.
- Flow map draws a process as a node with its lifecycle (start events in, end events out) distinguished from a policy's single reaction; the consumable page's "Reacted-to-by" lists processes; the context page gains a Processes section; a process page in the same shape as the policy page; doc generator and tree follow; the skill's interview asks "does anything wait for more than one event before it acts, and what tells it that it is done?".
- Decision 15's "policies stay stateless" section is rewritten: the policy stays stateless because the process now exists.

## Amendment (2026-09-08)

A process's own steps feed it: it issues an operation, the operation raises the event the process waits for next, and so on to the end. The reaction walk reads that as the process's lifecycle, not as a ring; a cycle is reported only when the walk returns to a node other than the process itself (card 81). The first implementation exempted only the ending event and would have reported every multi-step process.

## Amendment (2026-09-08, second)

A process could wait only on events, so the commonest process-manager shape, call and branch on the answer, had no honest form: RiverMart published a declined payment as an event against decision 25's own example, and NorthBank described a synchronous verdict and modelled two events. A process's `on` and `ends`, and a policy's `on`, may name a schema an operation returns or rejects with, meaning when that answer comes back; the reaction walk and the flow map read the answer as a step from the operation (card 92). Delivery is still implied by the consumable's type: the answer is synchronous because the operation is.

## Amendment (2026-09-08, third)

The second amendment let a reactor name an answer by its schema, and Codex's review showed the defect at once: two operations rejecting with one shared shape both reached the same reactor. An answer is named by its origin, `<operation>/returns` or `<operation>/rejects/<schema>`, refs of their own in the grammar, and the walk steps from exactly that operation (card 94). Decision 09's sharing of schemas across consumables stands untouched.

## Amendment (2026-09-09)

Two things the architect's fourth review showed. A process that branches on the answer of an operation it issues itself, a local validation, had to declare a consumption nobody makes; an answer of an operation the reactor issues is now a trigger without one (card 95). And a per-instance deadline, cancel if unpaid after thirty minutes, is the process's own, not a calendar event from a Clock context: a process declares `deadlines`, each an event it raises to itself after a stated interval, and may wait on or end on it. Decision 28's Clock stays for calendar events every context shares.

## Amendment (2026-09-09, second)

A deadline has an interval and now an anchor: `from` names the process's own trigger the interval counts from, absent meaning from the start; a statutory clock counts from the application's receipt, a delivery window from the dispatch (card 98). Pausing a clock stays prose in the deadline's description; the model states when a clock starts and how long it runs, not the conditions that stop it.

## Amendment (2026-09-09, third)

A command starts a saga as often as an event does: `starts` may name an operation of the process's own context, the one that creates an instance, and the reaction walk steps from it to the process (card 99). The earlier reasoning, that nothing waiting on an answer can be created by it, was about answers and was overapplied to commands.

## Amendment (2026-09-09, fourth)

An answer returns to its caller: a reactor waits on an operation's answer only when it, or an operation it issued, made the call, so two contexts that each call one service never wake each other through it (card 100). A named cost: a deadline belongs to a process, and an aggregate that expires on its own clock, an authorisation, a quote, a session, is modelled by the process that watches it or by a scheduled operation that raises the expiry; the aggregate itself holds no timer.

## Note (2026-09-09)

The lifecycle test is whether the process is the ring's only reactor, not whether the ring stays inside one context: a process that issues its operation, whose call reaches the next context, and waits for that context's fact is stepping through its own life across a boundary, and NorthBank's onboarding and RiverMart's checkout are that shape. Card 102 briefly narrowed the exemption to own-context steps and the two reference models warned; the narrowing was carrying no weight, because the two-caller defect it aimed at was closed by routing an answer to the call that asked (card 100).

## Amendment (2026-09-10)

An answer routes to the reactor that called: when two reactors in one context call one operation, each hears only the answer to the call it made, by the `by` that names it; the single-consumption inference applies only where no `by` is written. And a process that re-enters itself through a `starts` trigger is a loop spawning instances, not a lifecycle, and is reported (card 104).

## Amendment (2026-09-10)

The only-reactor lifecycle exemption was written for a process alone on its ring. NorthBank's honest wiring of its gateway put a second reactor on the ring, the gateway's policy that hears the scheme's answer through an anti-corruption layer and republishes it as the bank's own event, and `reaction-cycle` reported the instruction lifecycle twice (card 109). Such a policy translates; it starts nothing the process did not start. A ring on which one process sits and every other reactor is a policy that hears its event through an `anti-corruption-layer` consumption and whose operations raise its own context's events is that process's lifecycle through the layer, not a cycle (card 108). NorthBank's reference model wires the send once the rule says so (card 110).

## Note (2026-09-10, second)

The lifecycle-through-a-layer exemption was implemented on the shape of the ring alone, one process and translating policies, without proving its premise: that the event the process hears on the ring continues an instance. A translated event that starts the process spawns a new instance every time round, and Codex's ninth review drew one that validated clean. The exemption holds only where the process hears the ring's event through `on` or `ends`; a ring whose translated event is in `starts` is a cycle that spawns instances and is reported as one (card 113).
