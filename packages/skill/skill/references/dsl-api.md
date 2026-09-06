# DSL reference (`@open-domain-specification/core`)

Every class is created through its parent and registers itself there, so `parent.addX(...)`
is the only call needed. Every attributes object accepts an optional `id` to fix the id
independently of the name.

| Receiver | Method | Creates / does |
|---|---|---|
| — | `new Workspace(name, { odsVersion, description, version, homepage?, logoUrl?, primaryColor?, id? })` | the workspace |
| `Workspace` | `addDomain(name, { description })` | a domain |
| `Workspace` | `addTeam(name, { description?, homepage? })` | a team |
| `Workspace` | `addBoundedContext(name, { description, subdomains?, bigBallOfMud?, external?, team? })` | a context serving zero or more subdomains; `external: true` for a system you integrate with and do not own |
| `Workspace` | `addRelationship({...})` | a relationship; prefer the context helpers below |
| `Workspace` | `validate()` | the diagnostics list |
| `Workspace` | `toSchema()` / `Workspace.fromSchema(json)` | serialise / load |
| `Domain` | `addSubdomain(name, { type, description })` | a subdomain; `type` is `"core" \| "supporting" \| "generic"` |
| `Subdomain` | `addBoundedcontext(name, { description, bigBallOfMud?, team? })` | a context serving this subdomain |
| `Workspace` | `addBoundedContext(name, { description, external: true })` | an external system: it provides and consumes consumables and takes part in relationships, and has no subdomain, no team, no aggregates, no policies, no processes and no invariants |
| `BoundedContext` | `serves(subdomain)` | adds a served subdomain |
| `BoundedContext` | `ownedBy(team)` | sets the owning team |
| `BoundedContext` | `upstreamOf(other, { type?, name?, upstreamRoles?, downstreamRoles?, description?, comments?, disposition? })` | directed relationship, this side upstream; `type` defaults to `"upstream-downstream"`, or `"customer-supplier"`. `name` is what this agreement is called, needed only where the pair holds more than one in this direction — a negotiated fulfilment API beside a tolerated legacy feed — and it is appended to the ref |
| `BoundedContext` | `downstreamOf(other, options)` | the same, this side downstream |
| `BoundedContext` | `partnerOf(other, { name?, description?, comments?, disposition? })` | partnership |
| `BoundedContext` | `sharesKernelWith(other, options)` | shared kernel |
| `BoundedContext` | `separateWaysFrom(other, options)` | separate ways |
| `BoundedContext` | `addAggregate(name, { description })` | an aggregate |
| `BoundedContext` | `addService(name, { type, description })` | a service; `type` is `"application" \| "domain"` |
| `BoundedContext` | `addPolicy(name, { description, on?, issues? })` | a policy; chain `.on(...events).issues(...operations)`, or pass the two lists as attributes. `on` may also name an answer of an operation this context consumes — `operation.returned()`, `operation.rejected(schema)`, or `operation.completed()` for an operation that returns nothing — which means "when that answer comes back". An answer is named by the call it comes back from, never by the shape alone |
| `BoundedContext` | `addProcess(name, { description, starts?, on?, issues?, ends?, comments?, disposition? })` | a process: a reaction that holds state across events. Chain `.starts(...events).on(...events).issues(...operations).ends(...events)`, or pass the four lists as attributes. `starts` names the event, or the operation of this context, that creates an instance — a command starts a saga as often as a fact does, and a starting command is this context's own. `starts`, `on` and `ends` may name another context's events, and `on` and `ends` may name an answer of an operation this context consumes — `operation.returned()`, `operation.rejected(schema)` or `operation.completed()`, the answer to a call it made; `issues` names operations of its own context, like a policy's; `on` and `ends` may also name one of the process's own deadlines |
| `Process` | `addDeadline(name, { description, after, from? })` | a time limit this process keeps on its own instances: `after` is how long it waits, in the business's own words ("30 minutes", "two working days"), and `from` is the trigger it counts from, one of the process's own `starts` or `on` entries, left off when the clock runs from the start of the instance. It behaves as an event the process raises to itself, so pass it to the process's own `on` or `ends`; nothing else may name it. A per-instance timer needs no Clock context — that is for calendar events every context shares |
| `BoundedContext` | `addTerm(name, { definition, aliases?, embodiedBy? })` | a glossary term; or chain `.embody(element)` |
| `BoundedContext` | `addSchema(name, { description? })` | a payload schema; add fields with `addAttribute` |
| `BoundedContext` | `addValueObject(name, { description, specialises? })` | a value object of this context; every aggregate in it may hold one. `specialises` is the value object this one is a kind of — one of this context's, or one it borrows over a `shared-kernel` |
| `BoundedContext` | `addInvariant(name, { description, precondition?, postcondition? })` | a rule that holds across the context's instances or aggregates — uniqueness, a quota, a limit — or the contract of an operation in a context with no aggregate at all; chain `.constrains(...entities, valueObjects, attributes of any of its aggregates, and at least one operation of the context that checks it)`. `precondition: true` says the check is made on the way in, `postcondition: true` that it is made of what comes back; either may also constrain attributes of a schema that operation takes, returns or rejects with. The two flags are exclusive, and either follows composition into the shapes those schemas compose |
| `Aggregate` | `addRootEntity(name, { description })` | the root entity |
| `Aggregate` | `addEntity(name, { description, root?, specialises? })` | an entity; `specialises` is the entity of this aggregate it is a kind of, giving it that entity's attributes and relations as well as its own. A kind is never `root` |
| `Aggregate` | `addInvariant(name, { description, precondition?, postcondition? })` | a rule that holds inside the aggregate on every save; chain `.constrains(...entities, valueObjects, attributes or the aggregate's own consumables)`. Naming an operation says which operation keeps the rule; set `precondition: true` for a rule checked before that operation runs and not true after it, or `postcondition: true` for a guarantee about what it answers with. Either must name the operation it is about, and the two are exclusive; a precondition may constrain attributes of a schema that operation takes, returns or rejects with, a postcondition those of what it returns or rejects with, and both follow composition into the shapes those compose |
| `ValueObject` | `addInvariant(name, { description })` | a rule that holds by construction of the value — a checksum, a single currency; chain `.constrains(...its own attributes)` and nothing else. It needs no guard: a value that breaks it is never made |
| `Aggregate`, `Service` | `provides(name, { type, description, pattern?, internal?, schema?, returns?, rejects?, comments?, disposition? })` | a consumable; `type` is `"event" \| "operation"`, `pattern` is `"open-host-service" \| "published-language"`; `schema` is what the caller sends, `returns` what an operation answers with and `rejects` the schemas it answers with when it refuses, all schemas of the provider's own context; `returns` is a schema for one of that shape, or `{ schema, many: true }` where the answer is a list of it |
| `Aggregate`, `Service` | `consumes(consumable, { pattern?, by?, relationship?, comments?, disposition? })` | a consumption; `pattern` is `"conformist" \| "anti-corruption-layer"`; `by` names what makes this exchange, and is left off when the whole consumer depends on it: on a consumption of an operation, the consumer's own operations that make the call; on a consumption of an event, the policies or processes of its context that wake on it, because a subscription is woken rather than issued. `relationship` names the agreement this exchange runs under, and is needed only where the pair holds more than one in that direction (`consumption-agreement`) |
| `Consumable` | `raises(...events)` | the events an operation raises |
| `Entity`, `ValueObject`, `DataSchema` | `addAttribute(name, { type, description?, identity?, optional?, valueobject?, schema?, identifies? })` | an attribute; `type` is free text, `valueobject` and `schema` are mutually exclusive, and only a `DataSchema`'s attribute may use `schema`; `identifies` is what the attribute holds the identity of — an entity, root or child, in this or another context, or an external bounded context when the id belongs to a system nobody here models inside; `optional: true` marks an attribute that is sometimes absent, and is left off for everything always present, which an identity attribute always is |
| `Entity`, `ValueObject` | `uses(target, label, cardinality?, { for? })` | a `uses` relation, at a value object of the same context. The cardinality says how many the attribute holds, which is a different fact from whether it is there — `*` or `1..*` for a list whether or not it is optional, `1` for a required attribute that is not a list, `0..1` for an optional one that is not a list — and where two relations point at the same value object, `for` is the name of the attribute each one draws, so the label stays a phrase |
| `Entity`, `ValueObject` | `includes(target, label, cardinality?, { for? })` | an `includes` relation |
| `Entity`, `ValueObject` | `references(target, label, cardinality?, { for? })` | a `references` relation; across aggregates target the root |
| `Entity`, `ValueObject` | `addRelation(target, { relation, label?, cardinality?, for? })` | any relation explicitly |
| `Entity` | `.attributes.get("name")` | look an attribute up, e.g. to constrain it |

Every relationship, consumable and consumption also takes the evidence pair from
RFC-002: `comments` is a list of `{ text, link? }`, where a link is
`{ kind, url, label? }` and `kind` is
`"code" | "contract" | "adr" | "runbook" | "dashboard"`; `disposition` is
`"by-design" | "tolerated" | "refactor"` and defaults to `by-design`, which is never
written to JSON. Read one back with `dispositionOf(element)`, and list the intents
nobody has documented with `intentsWithoutComments(workspace)`.

`cardinality` is `"1" | "0..1" | "*" | "1..*"`. Chainable methods (`raises`, `on`, `issues`,
`constrains`, `embody`, `serves`, `ownedBy`) return their receiver.
