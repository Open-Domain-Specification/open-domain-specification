# What the model leaves out on purpose, and what it costs

Several things a reader expects from Domain-Driven Design are not fields here. They are this
model's own preferences about how a context is drawn, not consequences of DDD itself: Evans and
Vernon admit other shapes, and the model chooses these because they keep the maps and the
reaction walk readable and checkable. Say so when a user asks why something is missing, and
never present a preference as a law.

## The preferences

- **No delivery flag** — type is kind, not delivery: an event is a fact, an operation is an
  intent, and how either travels is a comment on the consumption where it matters.
- **No coordination fields on a process** — what a process correlates on, how it branches and
  what it undoes are prose in its description; it declares only what starts it, what it waits
  for, what it issues, its deadlines and what ends it.
- **No modules** — the bounded context is the namespace and everything is flat inside it; a
  context with dozens of aggregates is the interview's cue to ask whether a subdomain split is
  meant, and grouping for the reader is the renderer's job.
- **No actors** — an operation people call through a screen is an operation nobody in the model
  consumes, which is the normal case; who may call it is a sentence in the description, and a
  maker-checker rule is an invariant in prose on the approving operation.
- **No read-model element** — a projection is a service providing a query operation that says
  what it returns; a policy of the context reacts to the events that feed the view and issues the
  operation that writes what the query later reads.
- **No operations on a value object** — a consumable is what a node offers across its boundary,
  and a value's behaviour crosses nothing: it is the value's invariants and its description.
- **An entity has one home** — exactly one aggregate of exactly one context, even where two
  teams jointly own it; a jointly owned entity is an aggregate of a kernel context both consume.
- **A context invariant records the check, not the store** — it names the operation that makes
  the check; whether a unique index or a serialisable transaction also holds the rule is outside
  what the model claims.

## What each preference costs

The costs are named rather than hidden. Where a user hits one, say which it is.

- **The boundary is drawn twice.** Every outbound call is an internal operation on the
  application service that consumes the foreign one, even for a conformist with nothing to
  translate, so one crossing is two operations and a domain service that wants an outbound port
  pays for it in one more.
- **An answer routes one hop.** An operation's answer reaches the reactor that issued it and
  nobody further, so a process whose front makes the call does not hear the neighbour's reply
  through that front; the chain has to be written where the reader can follow it.
- **A kernel context loses the pairwise fact.** Many contexts sharing a kernel is drawn as a
  third context they all consume, which gains an honest owner and loses Evans's reading of a
  kernel as code inside each sharer; two contexts sharing one borrow each other's value objects
  and schemas directly instead.
- **Union answers and aggregate timers each wait on a named condition.** An operation answers
  with one shape, so an either-or that is not a refusal has no form yet; and a deadline belongs
  to a process, so an aggregate that expires on its own clock is watched by a process or by a
  scheduled operation that raises the expiry. Both reopen on a stated condition rather than on
  taste.
- **Rules carry no comments.** Comments live on the seams — consumables, consumptions and
  relationships — so an invariant, a policy or an aggregate cannot cite the test that enforces
  it, and the evidence for a rule is its description.
- **Translation across a boundary is prose.** A consumption records that an anti-corruption
  layer exists, with its pattern, its comments and its `by`; the map from the upstream's shapes
  and terms to the downstream's lives in the description, because a mapping table would be the
  expression language the model refuses.
