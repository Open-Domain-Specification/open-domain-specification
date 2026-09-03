# DDD terms in one sentence each

Use these the first time a term comes up, filling the example with the user's own words.
Never repeat an explanation, and never explain a term the user already used correctly.

- **Domain** — the whole area of business the system exists for, e.g. "running the pet store".
- **Subdomain** — one slice of that problem, e.g. "the catalogue" or "taking orders"; calling it
  *core* only marks where your competitive effort goes, *supporting* means needed but ordinary,
  *generic* means you would buy it.
- **Bounded context** — a boundary inside which every word has one exact meaning; your billing
  "Customer" and your support "Customer" being different things is why they get separate
  contexts.
- **Ubiquitous language / glossary** — the words a context uses, written down once so code,
  conversations and documents all mean the same thing by "Order".
- **Team ownership** — the people who decide what a context means and how it changes.
- **Big ball of mud** — a context whose model nobody fully controls, flagged so that anything
  talking to it translates rather than trusts.
- **Entity** — something that matters because of *which one* it is, like this particular order,
  so it carries an identity.
- **Value object** — something that matters only by its values, like an address; two with the
  same values are interchangeable.
- **Attribute** — one piece of information an entity, value object or message carries; the
  identity attribute is the one that tells two entities apart.
- **Aggregate** — the cluster of things you change together and check rules across, named after
  its *root*, the one thing you go through to change any of it; the order and its lines.
- **Invariant** — a rule that must always hold inside an aggregate, such as "quantity is never
  zero".
- **Relation** — how one thing points at another: *includes* for parts that cannot exist alone,
  *uses* for values it carries, *references* for another aggregate's root by identity.
- **Cardinality** — how many of the other thing: exactly one, at most one, any number, at least
  one.
- **Operation** — something you can ask a part of the system to do, like "place an order"; in
  conversation people often say *command*.
- **Event** — a fact that already happened, stated in the past tense, like "order placed", that
  other parts can react to.
- **Consumable** — an operation or event that a part offers, and **consumption** is another part
  using it.
- **Schema** — the shape of the information that travels with an operation or event.
- **Policy** — a rule of the form "when this event happens, do that operation", possibly across
  contexts.
- **Application service** — the part that fronts an API or a screen and turns requests into
  operations on aggregates.
- **Domain service** — business logic that does not belong to any single thing, like pricing
  across several orders.
- **Upstream / downstream** — the side that is depended on, and the side that depends on it.
- **Customer-supplier** — a dependency where the downstream side gets a say before the upstream
  side changes things.
- **Partnership** — two contexts whose teams plan and release together.
- **Shared kernel** — code or data two contexts both own and change.
- **Separate ways** — a deliberate decision that two contexts will not integrate.
- **Open host service** — the upstream side offers a documented API for anyone to use.
- **Published language** — the upstream side offers a documented message format everyone
  agrees on.
- **Conformist** — the downstream side takes the upstream model as it comes.
- **Anti-corruption layer** — the downstream side copies and reshapes what it receives into its
  own terms, so the upstream model cannot leak in.
