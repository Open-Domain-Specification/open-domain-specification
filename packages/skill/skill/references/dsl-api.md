# DSL reference (`@open-domain-specification/core`)

Every class is created through its parent and registers itself there, so `parent.addX(...)`
is the only call needed. Every attributes object accepts an optional `id` to fix the id
independently of the name.

| Receiver | Method | Creates / does |
|---|---|---|
| — | `new Workspace(name, { odsVersion, description, version, homepage?, logoUrl?, primaryColor?, id? })` | the workspace |
| `Workspace` | `addDomain(name, { description })` | a domain |
| `Workspace` | `addTeam(name, { description?, homepage? })` | a team |
| `Workspace` | `addBoundedContext(name, { description, subdomains?, bigBallOfMud?, team? })` | a context serving zero or more subdomains |
| `Workspace` | `addRelationship({...})` | a relationship; prefer the context helpers below |
| `Workspace` | `validate()` | the diagnostics list |
| `Workspace` | `toSchema()` / `Workspace.fromSchema(json)` | serialise / load |
| `Domain` | `addSubdomain(name, { type, description })` | a subdomain; `type` is `"core" \| "supporting" \| "generic"` |
| `Subdomain` | `addBoundedcontext(name, { description, bigBallOfMud?, team? })` | a context serving this subdomain |
| `BoundedContext` | `serves(subdomain)` | adds a served subdomain |
| `BoundedContext` | `ownedBy(team)` | sets the owning team |
| `BoundedContext` | `upstreamOf(other, { type?, upstreamRoles?, downstreamRoles?, description? })` | directed relationship, this side upstream; `type` defaults to `"upstream-downstream"`, or `"customer-supplier"` |
| `BoundedContext` | `downstreamOf(other, options)` | the same, this side downstream |
| `BoundedContext` | `partnerOf(other, description?)` | partnership |
| `BoundedContext` | `sharesKernelWith(other, description?)` | shared kernel |
| `BoundedContext` | `separateWaysFrom(other, description?)` | separate ways |
| `BoundedContext` | `addAggregate(name, { description })` | an aggregate |
| `BoundedContext` | `addService(name, { type, description })` | a service; `type` is `"application" \| "domain"` |
| `BoundedContext` | `addPolicy(name, { description })` | a policy; chain `.on(...events).then(...operations)` |
| `BoundedContext` | `addTerm(name, { definition, aliases?, embodiedBy? })` | a glossary term; or chain `.embody(element)` |
| `BoundedContext` | `addSchema(name, { description? })` | a payload schema; add fields with `addAttribute` |
| `Aggregate` | `addRootEntity(name, { description })` | the root entity |
| `Aggregate` | `addEntity(name, { description, root? })` | an entity |
| `Aggregate` | `addValueObject(name, { description })` | a value object |
| `Aggregate` | `addInvariant(name, { description })` | an invariant; chain `.constrains(...entities, valueObjects or attributes)` |
| `Aggregate`, `Service` | `provides(name, { type, description, pattern?, internal?, schema? })` | a consumable; `type` is `"event" \| "operation"`, `pattern` is `"open-host-service" \| "published-language"` |
| `Aggregate`, `Service` | `consumes(consumable, { pattern? })` | a consumption; `pattern` is `"conformist" \| "anti-corruption-layer"` |
| `Consumable` | `raises(...events)` | the events an operation raises |
| `Entity`, `ValueObject`, `DataSchema` | `addAttribute(name, { type, description?, identity?, valueobject? })` | an attribute; `type` is free text |
| `Entity`, `ValueObject` | `uses(target, label, cardinality?)` | a `uses` relation |
| `Entity`, `ValueObject` | `includes(target, label, cardinality?)` | an `includes` relation |
| `Entity`, `ValueObject` | `references(target, label, cardinality?)` | a `references` relation; across aggregates target the root |
| `Entity`, `ValueObject` | `addRelation(target, { relation, label?, cardinality? })` | any relation explicitly |
| `Entity` | `.attributes.get("name")` | look an attribute up, e.g. to constrain it |

`cardinality` is `"1" | "0..1" | "*" | "1..*"`. Chainable methods (`raises`, `on`, `then`,
`constrains`, `embody`, `serves`, `ownedBy`) return their receiver.
