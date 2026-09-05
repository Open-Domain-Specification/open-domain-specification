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
