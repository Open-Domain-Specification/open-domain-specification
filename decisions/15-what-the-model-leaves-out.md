---
status: Accepted
date: 2026-09-06
---
# Decision 15 — What the model deliberately leaves out, and why

## Context

The model is written from an interview with the people who own a domain, in their own words, and read back by architects, developers and product people on one page per element. Every field is a question the interview must ask and a row a reader must scan. An external review of the metamodel (2026-09-05) listed several constructs it expected and did not find. Some were real gaps and became decisions 13 and 14. The rest are deliberate, and this record says so in one place so the next review finds the reasoning rather than the absence.

## Decision

A word on what these are. Several of the rules below, and in decisions 17, 21 and 23, are this model's preferences about how a context is drawn, not consequences of Domain-Driven Design: that a context acts through an application service, that a domain service holds no outbound port, that a process names its steps and not their coordination. DDD as Evans and Vernon wrote it admits other shapes. The model chooses these because they make the maps and the reaction walk readable and checkable, and it says so here so a reader does not mistake a preference for a law.s

### A policy stays stateless, because the process now exists

Superseded in part by [decision 23](23-a-process-holds-state-across-events.md). A policy is still `on` events, `then` operations, and `on` is still any-of: it fires when any listed event happens, remembers nothing, and is one reaction. What this section used to add — that correlation across several events is "a process, not a policy", and that a real process is "modelled as an aggregate with internal operations" — was the part that did not hold. An order fulfilment that waits for payment, reservation and a carrier booking is not an aggregate, because it holds no invariant of its own; it is a thing that remembers which events have arrived and acts when enough have, and DDD has a name for it. `ProcessSchema` is that name, and the policy keeps its stateless definition because the process is now somewhere else to put the state.

What stays left out is the same in both: correlation keys, deadlines, compensation and data-dependent branching are still not fields. A process states that it exists, what starts it, what it waits for, what it issues and what ends it; how it decides is prose in its description and code in the repository. That is the line this record has always drawn, and decision 23 draws it in the same place one element further on. A timeout is still an event nobody raises, and the model still asks whether such an event is ever emitted. Revisit only when two reference models cannot say what they need without a field for correlation or for time.

### Delivery is implied by the consumable's type

An event is asynchronous; an operation is a call the caller waits on. There is no `delivery` flag, because it would restate `type` on nearly every consumable and add a fourth mark to port badges that already carry role, disposition and implied-edge marks. The rare exception, a command carried over a queue, is what a comment on the consumption is for (RFC-002), where the author can also say why.

### Commands and operations are one thing (decisions 09 and 11)

A command to an aggregate and an operation on an application service turned out to be the same element seen from two sides, and decision 09 merged them. Whether an operation is internal or offered across a boundary is `internal`; whether it is domain or application is the provider's type; whether an event is a domain event or an integration event is `internal` plus its `pattern`. No further vocabulary is added.

### Attribute types are free text; invariants are prose

`AttributeSchema.type` is a string in the author's words (`int64`, `'available' | 'pending' | 'sold'`, `string (URL)`), and an invariant is a name, a sentence and the elements it constrains. A primitive vocabulary and an expression language would move the model from the author's language into code, which loses the product reader and verifies nothing the code's own tests do not. The one omission worth its cost, an optional flag on an attribute, was deferred until a reference model needed it; the petstore did, and [decision 24](24-an-attribute-may-be-optional.md) added it. Because the type is the author's text, the validator never parses it, with one convention: a trailing `[]` means many, and the `attribute-relation-coherence` rule reads only that when it compares an attribute with its relation's cardinality. It does not match the string against a value object's name; the `valueobject` reference is the link, and the text beside it is the reader's.

### Versions are names

A schema or a consumable has no version field. A changed contract that old consumers still need is a second consumable or schema with a name that says so, `OrderPlacedV2`, consumed by whoever moved, with a comment on the old one saying why it stays; the consumable map then shows who is on which. A version number on one element would either mean nothing (nobody consumes a number) or need a compatibility model the validator cannot check. Reopened if a reference model has to carry more than two versions of one thing at once.

### Time inside an attribute is the author's text

Valid-from and valid-to, effective dates, and bi-temporal rules ("the rate that was known on the day the claim was made") are not fields: a temporal attribute is typed in the author's words (`DateRange`, `EffectivePeriod`), often as a value object with its own invariant, and a bi-temporal rule is an invariant in prose on the aggregate that keeps it. A first-class validity dimension would put a calendar into every attribute and a temporal algebra into the validator, which verifies nothing the code's own tests do not. Reopened if a reference model needs the validator to reason about two time axes at once.

### Two integrations between one pair in one direction are one relationship

`relationship-duplicate` refuses a second directed relationship in the same direction between one pair. A negotiated API and a take-it-as-published event stream between the same two contexts are therefore one relationship carrying both roles, and the map shows one line. Evans draws a map per relationship; the model draws it per pair and direction because a second line between the same two boxes says nothing the roles do not, and the comments on the one relationship say which consumable follows which pattern. Reopened if a reference model needs two dispositions on one pair in one direction.

### Anonymous structures in a type string are the author's shorthand

An attribute typed `{ratio, uri}[]` is text (decision 15's own rule); the model does not parse it and the ubiquitous language does not gain a term from it. The honest form is a value object with a name, and the reference models are asked to prefer it; the shorthand stays legal because refusing it would mean parsing types.

### Read models are query services

A projection is a service that provides a query operation; with decision 13 that operation says what it returns. No `ReadModel` construct is added. Petstore's inventory projection is a bounded context of its own because it serves two subdomains, not because the model forced it.

### Context maps cluster by primary subdomain (decision 02)

A context serving several subdomains draws in the cluster of its first; the others are links. The cluster is a visual namespace, not a claim of exclusivity.

### There is no subtyping between entities or value objects

Superseded by [decision 22](22-an-entity-may-be-a-kind-of-another.md): the condition this section set for reopening — a reference model that cannot name its concept without inheritance — was met by two, so `specialises` exists and says "is a kind of" directly. The reasoning that a hierarchy usually hides a missing concept stands, and is now the interview's question rather than a refusal.

### An aggregate is a boundary; its root is the entity you reach it by

An aggregate has its own name and description because it is more than its root: it holds the entities, value objects, invariants and consumables inside one consistency boundary. Relations target the root entity because a relation is between entities; provisions target the aggregate because a consumable belongs to the boundary, not to one entity. Naming the root after the aggregate is a convention, not a duplication, and a reader sees both on one page.

### The aggregate tree is a tree of instances

`aggregate-tree` says an aggregate is loaded and saved as one thing through its root, so every entity is reachable from the root. The model declares types, not instances, and a graph of types says nothing conclusive about a tree of instances: a questionnaire's groups contain questions that contain groups, and every instance is still a finite tree. The rule therefore checks reachability and the containment targets and judges no cycle among types at all (card 82, after Codex's first review reproduced a valid model it rejected). Earlier wordings forbade self-inclusion, then only mutual inclusion, and were wrong both times for the same reason.

### A rule that spans aggregates is not an invariant

Superseded by [decision 27](27-a-context-has-invariants-across-instances.md): a rule across the instances or aggregates of one context is an invariant of that context, guarded by an operation that checks it before acting.

### A context has no modules

Aggregates, services, policies and schemas are flat within a context. A context with dozens of aggregates is the model saying it should be more than one context, or that its subdomain should be split; adding a folder would hide that. Reopened if a reference model has a context that genuinely needs an internal grouping the reader cannot get from ordering and description.

### A relation carries one multiplicity, read from the source

`cardinality` on a relation says how many targets a source has, because that is the question a reader asks of a class diagram ("how many lines does an order have?"). The reverse multiplicity is not modelled: for `includes` it is always one (a part has one whole), for `references` and `uses` it is unbounded unless the domain says otherwise, and saying otherwise is a sentence in the description. Two-ended multiplicity would double the interview questions for a fact that is rarely the point.

### A relationship is between two contexts

`partnership`, `shared-kernel` and `separate-ways` take exactly two participants. Three contexts in partnership are three pairs, each of which may differ in its comments and disposition; a single three-way edge would draw as one line and hide that. The map already composes pairs. (A loop of reactions that converges, a balancing mechanism or a negotiation, is legitimate; `reaction-cycle` still warns, because the model has no conditions and the ending condition lives in the closing policy's description, and the warning is what sends a reader there.) When many contexts share one kernel, the kernel is a context of its own and each sharer declares one relationship with it (decision 16, amendment), so the count is the number of sharers, not the number of pairs.

### The ubiquitous language lives in the bounded context, not the domain

A glossary belongs to a bounded context because that is what a ubiquitous language is: one meaning per word inside one boundary. A word that means the same thing in two contexts is two terms that happen to agree, and the model would rather have a reader see that agreement (or its absence) than assume it. Industry vocabulary shared across a domain is documentation, not model; it belongs in the domain's description. Reopened if two reference models show real duplication with no drift at all.

### A policy issues operations; an operation raises events

`then` names operations only. Reacting to an outside event by publishing an inside one is not boilerplate to skip: the translation between the two is behaviour, it has a name (the operation), and an anti-corruption layer is exactly the place a reader wants to see it named. An event-to-event policy would hide the one thing the boundary exists to make visible.

### Array order is meaning: the first subdomain is the primary

`BoundedContextSchema.subdomains` is ordered, and the first is the subdomain the context is drawn under (decision 02). JSON arrays are ordered by definition, the JSON schema's description of the field says so, and the interview asks "which subdomain does it mainly serve?" first. An explicit flag would be a second place to say the same thing.

## Consequences

- A review that expects these constructs should find this record and argue with its reasoning rather than report their absence.
- Each section names the condition under which it would be reopened.

### An identity names one kind of thing

An attribute that is "an order id or a seller id" identifies nothing, because `identifies` names one entity. The model's answer is two optional attributes, each identifying its own target, with an invariant in prose that exactly one is set; RiverMart's `RiskAssessment.subjectId` is the case. A union identity would need a union type, which decision 18 leaves out. Reopened if a reference model needs more than two targets on one attribute.

### `raises` lists what an operation may raise

An operation that raises `StockReserved, StockShort` raises one of them; one that raises `HouseholdCreated, ProfileCreated` raises both. The list says what may follow, not which combination; the flow map reads every edge as "may raise", and the operation's description says whether they are outcomes or a fan-out. A structured either-or would need the conditions the model leaves out. Also corrected here: the polymorphic-identity entry cited RiverMart's `RiskAssessment.subjectId` as following its own answer, and it did not; card 95 makes it so.

### Corrections (2026-09-09)

Earlier entries in this record said a timeout is an event nobody raises and that deadlines are not fields. Decision 23's fourth amendment gave a process its own deadlines, each an event it raises to itself after a stated interval, counted from a named trigger (card 98). Those sentences are superseded; the rest of the policies entry stands.
