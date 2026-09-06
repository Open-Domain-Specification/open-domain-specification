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
- **No extension field** — an unknown key is an `unknown-field` diagnostic and is dropped on
  save; comments with links live on four seams only — consumables, consumptions, relationships
  and processes.

## What each preference costs

The costs are named rather than hidden. Where a user hits one, say which it is.

- **The boundary is drawn twice.** Every outbound call is an internal operation on the
  application service that consumes the foreign one, even for a conformist with nothing to
  translate, so one crossing is two operations and a domain service that wants an outbound port
  pays for it in one more. The architect's fourteenth round measured it: more than half of every
  stress model's operations are internal, most of them fronts, against two of sixteen in a
  clinic model written blind.
- **An answer stops at the boundary.** An operation's answer routes back along the calling
  context's own `by` chain, through as many local fronts as it takes, and no further: what the
  neighbour calls next is the neighbour's chain and nothing here has spoken for it, so a process
  hears the answer to the call its own context made and not the one behind it.
- **A kernel context loses the pairwise fact.** Many contexts sharing a kernel is drawn as a
  third context they all consume, which gains an honest owner and loses Evans's reading of a
  kernel as code inside each sharer; two contexts sharing one borrow each other's value objects
  and schemas directly instead.
- **Union answers and aggregate timers each wait on a named condition.** An operation answers
  with one shape, so an either-or that is not a refusal has no form yet; and a deadline belongs
  to a process, so an aggregate that expires on its own clock is watched by a process or by a
  scheduled operation that raises the expiry. Both reopen on a stated condition rather than on
  taste.
- **Rules carry no comments.** Comments live on four seams — consumables, consumptions,
  relationships and processes — so an invariant, a policy or an aggregate cannot cite the test
  that enforces it, and the evidence for a rule is its description. An unknown field fares
  worse: it is reported once, as `unknown-field`, and dropped on save, so nothing survives a
  round trip to hold what the model has no field for.
- **Roles are stated twice.** A downstream pattern on the consumption and an upstream one on the
  consumable are written per crossing exchange, and again on the relationship, so a pair carries
  about as many role declarations on exchanges as on the relationship itself; the gain is a pair
  that conforms on one feed and translates another, and the repetition is the price.
- **A partnership shares no shape of its own.** Two partners exchange consumables or events as
  equals, but a value object or a schema still crosses only over a declared borrowing: a partner
  pair that carries the other's value object or schema declares a shared kernel beside the
  partnership, which `relationship-duplicate` allows.
- **Translation across a boundary is prose.** A consumption records that an anti-corruption
  layer exists, with its pattern, its comments and its `by`; the map from the upstream's shapes
  and terms to the downstream's lives in the description, because a mapping table would be the
  expression language the model refuses.
- **`identifies` is opt-in, and a denormalised copy is invisible.** Nothing forces an author to
  hold the identity attribute that would record a dependency, and a fact one context copies from
  another — a seller rating held on an offer — shows nowhere unless the event that carried it is
  modelled too.
- **A product line's kinds repeat their shared attributes.** Specialisation stays inside one
  aggregate and one context on purpose, so a product line whose kinds sit in separate aggregates
  cannot inherit, and each aggregate restates the attributes the kinds share.
- **A version is a second name, and three at once is where that stops working.** A changed
  contract old consumers still need is a second consumable with a name that says so, not a
  version number, and that only gets revisited once a reference model has to carry more than two
  versions of one thing at a time.
- **A relation states one multiplicity, and only the source's.** How many of the other side one
  instance holds is not modelled; where that matters, it is a sentence in the description, not a
  second cardinality.
- **Order and timing inside a reaction are prose.** Whether a process's waited-for events must
  all arrive before it acts, or any one is enough, and what starts or clears a deadline's clock,
  are sentences in its description, not fields a tool can read.
- **`raises` says may, not which combination.** An operation that raises two events may raise
  either or both, and the flow map draws every edge the same way; which combination happens on a
  given call is the operation's description, not the model.
- **A consumption's ref moves.** The ref is computed from the pair it joins and only carries a
  caller's name once a second consumption of the same pair exists, so adding that second
  consumption changes the first one's ref.
- **A kernel's co-owners are not listed, and a context keeps one team.** The kernel's team field
  names whoever keeps it, not the sharers who jointly own it, because the model gives every
  context exactly one team.
- **A lifecycle has no transition table, and a deadline is never a fixed date.** A status's
  values, and the operations that move them, are the author's prose on an invariant, and a
  deadline is always an interval counted from a named trigger, never a date held in an attribute.
- **Inside a context, references and identities are two forms of one dependency.** A relation
  draws the line and its cardinality and an identity attribute names the key, and an author may
  write both for the one dependency without the model ever saying they are the same fact.
- **The wire and the model are typed apart.** An entity never carries a schema and a schema
  never names an entity, so a resource-style API restates its aggregate as one or more schemas —
  a `Pet` beside a `PetSummary` and a `RegisterPet` — with a shared value object bridging the
  leaves that repeat.
- **A workspace is one file.** Refs never cross files until decision 08's `WorkspaceSet` lands;
  a project that wants several files today keeps each as its own workspace.
- **A refusal enumerates its outcomes and a success does not.** A refusal's `reasons` names each
  shape a process may wait on and branch across; a success has one edge, and which of several
  things happened on the way is prose until a reference model needs to branch on it too.
- **A value object may hold an identity into an entity, but no relation to one.** A value that
  must point at an entity holds an `identifies` attribute instead of a relation, because a value
  has no identity of its own and draws no line.
- **Calendar-driven behaviour through a Clock costs a relationship and two roles.** A context
  that reacts to the calendar by consuming a Clock context pays for the relationship and the
  upstream and downstream roles on it; the cheaper route, a scheduled operation that raises the
  event itself, is the usual one.
