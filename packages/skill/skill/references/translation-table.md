# Translation table: what people say → what to record

Use this while interviewing and when reviewing a draft for mis-modelling. `JSON` is where the
element lives in a workspace file; `DSL` is the core call that creates it.

| What they say | ODS element | JSON | DSL |
|---|---|---|---|
| "the system for X", "our platform" | Workspace | top-level `name`, `description` | `new Workspace(name, {...})` |
| "the business areas", "departments", "lines of business" | Domain | `domains.<id>` | `ws.addDomain(name, {description})` |
| "the part that handles Y", "the Y job" | Subdomain | `domains.<d>.subdomains.<id>` | `domain.addSubdomain(name, {type, description})` |
| "what makes us different", "our secret sauce" | subdomain type | `"type": "core"` | `type: "core"` |
| "we need it but it's not special", "any sensible way works" | subdomain type | `"type": "supporting"` | `type: "supporting"` |
| "we'd buy it", "login / email / payments provider" | subdomain type | `"type": "generic"` | `type: "generic"` |
| "team X owns that", "that's Sam's service" | Team, owning context | `teams.<id>`; context `team: {$ref}` | `ws.addTeam(name)`; `bc.ownedBy(team)` |
| "in billing a customer means ..., in support it means ..." | two Bounded Contexts | `boundedcontexts.<id>` twice | `subdomain.addBoundedcontext(name, {...})` twice |
| "that part covers both Y and Z" | context serving two subdomains | `subdomains: [{$ref Y}, {$ref Z}]` | `ws.addBoundedContext(name, {subdomains: [y, z]})` or `bc.serves(z)` |
| "the old system", "legacy", "nobody understands its schema" | big ball of mud | `"bigBallOfMud": true` | `bigBallOfMud: true` |
| "the card scheme", "our payment provider", "the licensor", "their API" | external system (a context of its own) | `"external": true` | `ws.addBoundedContext(name, {external: true})` |
| "A depends on B", "A calls B", "A reads B's data" | upstream-downstream (B upstream) | `relationships[]` `type: "upstream-downstream"` | `a.downstreamOf(b, {...})` |
| "they ask us before changing", "we're their customer" | customer-supplier | `type: "customer-supplier"` | `a.downstreamOf(b, {type: "customer-supplier", ...})` |
| "both teams change it together", "we release together" | partnership | `type: "partnership"`, `participants` | `a.partnerOf(b, {description})` |
| "we share the same tables / library / code" | shared kernel | `type: "shared-kernel"` | `a.sharesKernelWith(b, {description})` |
| "we deliberately don't integrate" | separate ways | `type: "separate-ways"` | `a.separateWaysFrom(b, {description: why})` |
| "we use their API as-is", "we take whatever they send" | conformist | consumption `pattern: "conformist"`; relationship `downstreamRoles` | `agg.consumes(c, {pattern: "conformist"})` |
| "we copy and reshape their data", "we wrap their API" | anti-corruption layer | `pattern: "anti-corruption-layer"` | `agg.consumes(c, {pattern: "anti-corruption-layer"})` |
| "we expose a documented API", "there's a REST endpoint" | open host service | operation `pattern: "open-host-service"`; relationship `upstreamRoles` | `svc.provides(name, {type: "operation", pattern: "open-host-service"})` |
| "we publish a message format everyone agrees on" | published language | event `pattern: "published-language"` | `agg.provides(name, {type: "event", pattern: "published-language"})` |
| "this specific order", "the thing with a number" | Entity | `aggregates.<a>.entities.<id>` | `agg.addEntity(name, {description})` |
| "the main thing", "the one we name the rule about" | root entity | `"root": true` | `agg.addRootEntity(name, {description})` |
| "just a value", "an address", "money", "same values, same thing" | Value Object | `boundedcontexts.<bc>.valueobjects.<id>` | `bc.addValueObject(name, {description})` |
| "a title is a film or a series", "there are three sorts of account", "it's a kind of X" | kind of an entity or value object, each with what it adds | `specialises: {$ref}` on the entity or value object | `agg.addEntity(name, {description, specialises: parent})` |
| "that field only applies to the other sort" | the kinds, not one element with a flag | the attribute moves onto the kind that has it | declare the attribute on the kind |
| "they're all X really, nobody has a plain X" | the parent, with its description saying so | no abstract flag exists | say it in `description` |
| "it has a field", "it's made of" | Attribute | `attributes.<id>` with `type` in the user's words | `entity.addAttribute(name, {type})` |
| "the number that identifies it" | identity attribute | `"identity": true` | `identity: true` |
| "its status is one of these values" | attribute backed by a value object | `attributes.<id>.valueobject: {$ref}` | `addAttribute(name, {type, valueobject: vo})` |
| "each line has a sku and a quantity", "the address inside it" | attribute of a **schema** typed by another schema | `attributes.<id>.schema: {$ref}` | `addAttribute(name, {type: "OrderLine[]", schema: line})` |
| "these change together", "one transaction", "the order and its lines" | Aggregate | `aggregates.<id>` | `bc.addAggregate(name, {description})` |
| "must never", "always has to", "can't be negative", "only when" | Invariant | `invariants.<id>` with `constrains: [{$ref}]` | `agg.addInvariant(name, {description}).constrains(target)` |
| "once it's sold it can't go back", "that operation must not" | Invariant naming the operation it guards | `constrains: [{$ref to a consumable of the same aggregate}]` | `agg.addInvariant(name, {description}).constrains(operation)` |
| "only one of these per customer", "no more than five a day in total", "never twice for the same pair" | Invariant of the **context**, across its instances | `boundedcontexts.<id>.invariants.<id>`, `constrains` naming what it counts and the operation that checks it | `bc.addInvariant(name, {description}).constrains(attribute, operation)` |
| "an order points at a pet" (another cluster) | references relation | `relations[]` `relation: "references"` to the other root | `entity.references(otherRoot, label, cardinality)` |
| "it contains lines that can't exist alone" | includes relation | `relation: "includes"` | `entity.includes(child, label, cardinality)` |
| "it has an address / a status" | uses relation | `relation: "uses"` | `entity.uses(vo, label, cardinality)` |
| "exactly one / at most one / any number / at least one" | cardinality | `"1"` / `"0..1"` / `"*"` / `"1..*"` | third argument |
| "you can ask it to ...", "POST /x", "the button does ..." | operation | `provides.<id>` `type: "operation"` | `provides(name, {type: "operation", ...})` |
| "then we tell everyone that ...", a past-tense fact | event | `provides.<id>` `type: "event"` | `provides(name, {type: "event", ...})` |
| "doing that announces ..." | operation raises event | operation `raises: [{$ref event}]` | `op.raises(event)` |
| "only we use that", "nobody outside needs it" | internal consumable | `"internal": true`, no `pattern` | `internal: true` |
| "what's in the message / the request body" | Schema | `schemas.<id>` on the context; consumable `schema: {$ref}` | `bc.addSchema(name).addAttribute(...)`; `schema: s` |
| "what you get back", "the response body", "it returns ..." | Schema on the operation | operation `returns: {$ref}` on the provider's own context | `provides(name, {type: "operation", returns: s})` |
| "we decline it", "we refuse it", "they get an error saying why", "it's rejected" | Schema on the operation | operation `rejects: [{$ref}]` on the provider's own context | `provides(name, {type: "operation", rejects: [refusal]})` |
| "when X happens we then Y", "automatically after X" | Policy | `policies.<id>` with `on: [event refs]`, `then: [operation refs]` | `bc.addPolicy(name, {description}).on(e).issues(op)` |
| "we listen for their X" | consumption | `consumes: [{consumable: {$ref}, pattern}]` | `agg.consumes(theirEvent, {pattern})` |
| "we hold it until X and Y have both happened", "the checkout", "the onboarding", "order to delivery" | Process | `processes.<id>` with `starts`, `on`, `then`, `ends` | `bc.addProcess(name, {description}).starts(e1).on(e2).issues(op).ends(e3)` |
| "only renewal calls them", "just the dunning job talks to it" | the operations behind a consumption | consumption `by: [{$ref}, ...]`, the consumer's own operations, policies or processes | `svc.consumes(theirOp, {by: [renew]})` |
| "the API layer", "the endpoint handler", "the use case" | application service | `services.<id>` `type: "application"` | `bc.addService(name, {type: "application", description})` |
| "a materialised view", "the read side", "a cache of X kept for fast reads" | read model → query service, not a `ReadModel` construct (decision 15) | a query operation on an application service, with `returns` | `bc.addService("InventoryQuery", {type: "application"}).provides("GetInventory", {type: "operation", returns: countsSchema})` |
| "logic that doesn't belong to one thing", "pricing across orders" | domain service | `type: "domain"` | `type: "domain"` |
| "we call it ...", "a.k.a.", "sales say purchase" | Glossary term | `glossary.<id>` with `definition`, `aliases`, `embodiedBy` | `bc.addTerm(name, {definition, aliases, embodiedBy})` |
| "the database / queue / Kafka / the cloud" | not modelled | — | say it is infrastructure and out of scope |
