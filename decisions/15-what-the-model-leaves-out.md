---
status: Accepted
date: 2026-09-06
---
# Decision 15 — What the model deliberately leaves out, and why

## Context

The model is written from an interview with the people who own a domain, in their own words, and read back by architects, developers and product people on one page per element. Every field is a question the interview must ask and a row a reader must scan. An external review of the metamodel (2026-09-05) listed several constructs it expected and did not find. Some were real gaps and became decisions 13 and 14. The rest are deliberate, and this record says so in one place so the next review finds the reasoning rather than the absence.

## Decisions

### Policies stay stateless; there is no saga or process-manager construct

A policy is `on` events, `then` operations, and `on` is any-of: the policy fires when any listed event happens. Correlation across several events is a process, not a policy. Correlation state, deadlines, compensation and data-dependent branching are not modelled. Each would turn "when X happens, what do you do?" into four questions per policy (wait for what, for how long, then what, and how do you undo it), and most authors' honest answer is that they have not decided, which leaves fields empty and empty-state sentences multiplying. A multi-step process is already traversable: an operation raises an event, a policy reacts, another operation runs, and the consumable page shows both Raises and Reacted-to-by. A timeout is an event nobody raises, and the model already asks whether such an event is ever emitted. If a real model needs more, it models the process as an aggregate with internal operations, which petstore's order approval already does. Revisit only when two reference models cannot say what they need.

### Delivery is implied by the consumable's type

An event is asynchronous; an operation is a call the caller waits on. There is no `delivery` flag, because it would restate `type` on nearly every consumable and add a fourth mark to port badges that already carry role, disposition and implied-edge marks. The rare exception, a command carried over a queue, is what a comment on the consumption is for (RFC-002), where the author can also say why.

### Commands and operations are one thing (decisions 09 and 11)

A command to an aggregate and an operation on an application service turned out to be the same element seen from two sides, and decision 09 merged them. Whether an operation is internal or offered across a boundary is `internal`; whether it is domain or application is the provider's type; whether an event is a domain event or an integration event is `internal` plus its `pattern`. No further vocabulary is added.

### Attribute types are free text; invariants are prose

`AttributeSchema.type` is a string in the author's words (`int64`, `'available' | 'pending' | 'sold'`, `string (URL)`), and an invariant is a name, a sentence and the elements it constrains. A primitive vocabulary and an expression language would move the model from the author's language into code, which loses the product reader and verifies nothing the code's own tests do not. The one omission worth its cost, an optional flag on an attribute, is deferred until a reference model needs it. Because the type is the author's text, the validator never parses it, with one convention: a trailing `[]` means many, and the `attribute-relation-coherence` rule reads only that when it compares an attribute with its relation's cardinality. It does not match the string against a value object's name; the `valueobject` reference is the link, and the text beside it is the reader's.

### Read models are query services

A projection is a service that provides a query operation; with decision 13 that operation says what it returns. No `ReadModel` construct is added. Petstore's inventory projection is a bounded context of its own because it serves two subdomains, not because the model forced it.

### Context maps cluster by primary subdomain (decision 02)

A context serving several subdomains draws in the cluster of its first; the others are links. The cluster is a visual namespace, not a claim of exclusivity.

### There is no subtyping between entities or value objects

Relations are `references`, `includes` and `uses`; there is no `extends`. A class hierarchy is an implementation choice, and in a domain model it usually hides a missing concept: the kinds of account, or the formats of a title, are better said as a value object with a closed set of values, or as separate aggregates when they behave differently. Modelling a hierarchy as `includes` would be wrong, so the model refuses rather than misdraws. Reopened only if a reference model cannot name its concept without inheritance.

### An aggregate is a boundary; its root is the entity you reach it by

An aggregate has its own name and description because it is more than its root: it holds the entities, value objects, invariants and consumables inside one consistency boundary. Relations target the root entity because a relation is between entities; provisions target the aggregate because a consumable belongs to the boundary, not to one entity. Naming the root after the aggregate is a convention, not a duplication, and a reader sees both on one page.

### The aggregate tree is a tree of instances

`aggregate-tree` says an aggregate is loaded and saved as one thing through its root, so every entity is reachable from the root and no instance has two parents. The model declares types, not instances, and the rule reads it that way (card 50, after the seventh review run): an entity that includes its own type is the composite pattern, a category of categories, and is legal; an entity type included by two parent types is legal, because each instance still has one parent; only a cycle through two or more distinct types is an error, because then no type can be named as the one that holds the other. The first wording of the rule forbade all three and was wrong about two of them.

### A rule that spans aggregates is not an invariant

An invariant belongs to one aggregate because an aggregate is the boundary inside which a rule can be kept true in one transaction; that is what the boundary is for. A rule across several aggregates, a customer's daily limit summed over all their accounts, cannot be kept true that way, and calling it an invariant would promise a consistency the system does not have. The model holds it where DDD holds it: as an operation of a domain service, whose description states the rule and whose consumers are the application services that must ask before acting. Invariants therefore stay on aggregates, and may constrain that aggregate's operations (decision 19) but not a service's; the application service's operation reaches the invariant through the aggregate operation it consumes.

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
