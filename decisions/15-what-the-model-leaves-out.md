---
status: Accepted
date: 2026-09-06
---
# Decision 15 — What the model deliberately leaves out, and why

## Current position (2026-09-10)

This record lists the model's preferences, not DDD's laws, and the second amendment of 2026-09-10 (card 120) widened the list to: no modules, no actors, no read-model element, no operations on a value object, an entity has one home (decision 16), and a context invariant records the check, not the store (decision 27).

Sections superseded outright: "There is no subtyping" (decision 22); "A rule that spans aggregates is not an invariant" (decision 27); the policy section's former claim that a process is an aggregate (decision 23). Within the policy section, the sentences that a timeout is an event nobody raises and that deadlines are not fields no longer hold; see Corrections (2026-09-09) and decision 23's `deadlines` (card 98). Correlation, compensation and branching stay prose.

"Delivery is implied by the consumable's type" no longer holds as worded; see the second amendment of 2026-09-10: type is kind, not delivery; a queued command is an operation, and its consumption comment explains a `relationship-cycle` finding. "A context has no modules" keeps its conclusion with a corrected reason: the context is the namespace and no rule reads a grouping. "Read models are query services" gains its write side: a policy issues an internal operation that writes what the query reads.

"Two integrations in one direction are one relationship" was reopened on 2026-09-09 (card 103): named directed relationships may join one pair in one direction, and since the amendment of 2026-09-10 (card 107) a consumption between such a pair names its `relationship`.

Stable sections: commands and operations are one thing; attribute types are free text, with `optional` added (decision 24); versions are names; time inside an attribute; anonymous structures; comments and dispositions on the seam, extended by "Rules carry no comments" (2026-09-10); primary-subdomain clustering; the aggregate as a boundary; the tree of instances (card 82); one multiplicity from the source (decision 24, card 89); two participants per relationship, with the kernel context for many sharers (decision 16); glossary per context; a policy issues operations; array order; an identity names one kind of thing (card 95); `raises` lists what may follow.

Added on 2026-09-10: people are not modelled (moved from decision 28, card 120); a value object has no operations; translation across a boundary is prose (ninth round); the exemptions were shaped by four exemplars, and card 117's fifth held them, though its brief named the shapes.

## Context

The model is written from an interview with the people who own a domain, in their own words, and read back by architects, developers and product people on one page per element. Every field is a question the interview must ask and a row a reader must scan. An external review of the metamodel (2026-09-05) listed several constructs it expected and did not find. Some were real gaps and became decisions 13 and 14. The rest are deliberate, and this record says so in one place so the next review finds the reasoning rather than the absence.

## Decision

A word on what these are. Several of the rules below, and in decisions 17, 21 and 23, are this model's preferences about how a context is drawn, not consequences of Domain-Driven Design: that a context acts through an application service, that a domain service holds no outbound port, that a process names its steps and not their coordination. DDD as Evans and Vernon wrote it admits other shapes. The model chooses these because they make the maps and the reaction walk readable and checkable, and it says so here so a reader does not mistake a preference for a law.

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

`relationship-duplicate` refuses a second directed relationship in the same direction between one pair. A negotiated API and a take-it-as-published event stream between the same two contexts are therefore one relationship carrying both roles, and the map shows one line. Evans draws a map per relationship; the model draws it per pair and direction because a second line between the same two boxes says nothing the roles do not, and the comments on the one relationship say which consumable follows which pattern. Reopened on 2026-09-09 by Codex's seventh review: a negotiated fulfilment API and a tolerated legacy feed from one warehouse are two agreements with two dispositions in one direction. A directed relationship may carry a `name`, two named relationships may join one pair in one direction, and the ref carries the name; an unnamed duplicate is still refused (card 103).

### Anonymous structures in a type string are the author's shorthand

An attribute typed `{ratio, uri}[]` is text (decision 15's own rule); the model does not parse it and the ubiquitous language does not gain a term from it. The honest form is a value object with a name, and the reference models are asked to prefer it; the shorthand stays legal because refusing it would mean parsing types.

### Comments and dispositions sit on the strategic seam

A bounded context or an aggregate carries no disposition and no comments; those live on relationships, consumables, consumptions and processes, where the atlas meets the territory (RFC-002). "This legacy system is to be hollowed out" is said on its relationships. Reopened if the health report needs to list a context rather than its edges.

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

## Amendment (2026-09-10)

Card 103 named the agreements and left their exchanges pooled: a consumption could not say which named relationship it belongs to, so `relationship-roles-backed` read every crossing between the pair against every agreement and criticised each for the other's role, and the declared direction was whichever relationship came first. A consumption may name its `relationship`; between a pair with one agreement it need not, between a pair with two it must, and `consumption-agreement` says so once (card 107, Codex's eighth review).

### Rules carry no comments

Comments, the grounded statements about the real system, live on the seams: consumables, consumptions and relationships, where the running system diverges from the design. An invariant, a policy or an aggregate cannot cite the test that enforces it, so NorthBank's evidence pack for its rules is their descriptions. Named by the architect's eighth round; the cost is accepted until a model needs the citation, at which point `comments` extends to every named declaration in one change.

### Translation across a boundary is prose

An anti-corruption layer is defined by its translation and the model records only that it exists: a consumption carries its pattern, its comments and `by`, and the map from the upstream's shapes and terms to the downstream's lives in the description and in the discovery notes, as NorthBank's `SubmissionMessage` against `SchemeSubmission` does. A mapping table would be the expression language this record refuses. Named by the architect's ninth round; reopen when a reader of the pages, not of the notes, needs to see what a layer changes.

### The exemptions were shaped by four exemplars

This record calls the model's structural rules preferences, not DDD's laws; it did not say that the exemptions carved into them, the lifecycle rings, the translating policy, the called sub-process, were each written for a shape one of the four reference models needed. They are principled where they can be argued from this record's own reasoning, and every one is, but nothing yet shows they generalise. The test is a fifth model in a domain unlike the four, written blind (card 117); reopen the rules it has to work around, and count what it cost. Named by the architect's tenth round.

## Amendment (2026-09-10, second)

The five-whys on every reviewer contradiction (owner's instruction, 2026-09-10) found this record saying less than it means in six places, and each is corrected here rather than rewritten, so the history stays readable.

- The preamble's list of preferences named decisions 17, 21 and 23 and left out six the reviewers kept meeting: no modules, no actors, no read-model element, no operations on a value object, an entity has one home (decision 16), and a context invariant records the check, not the store (decision 27). All six are preferences, not DDD's laws, and card 120 puts the whole list on the docs site.
- The section "Delivery is implied by the consumable's type" says the opposite of what the record means. Type is kind, not delivery: an event is a fact, an operation is an intent; the model records no delivery. Most operations are awaited and `relationship-cycle` assumes so; a command carried over a queue is still an operation, and where that assumption produces a finding the consumption's comment says so.
- "A context has no modules" argued from size, which Evans refutes. The reason is structural: a module is a namespace and the model's namespace is the context; every ref is `#/boundedcontexts/<bc>/...` and no rule reads a grouping. A context with dozens of aggregates may be a sign a subdomain split is meant, and the interview asks; grouping for the reader is the renderer's job. Reopened when a reference model needs a rule to read a grouping.
- A value object has no operations. Consumables are what a node offers across its boundary; a value's behaviour crosses nothing and is its invariants and description. Reopened when a reference model needs a value's operation as a step in a reaction walk.
- People are not modelled, moved here from decision 28 where nobody would look for it. An operation people call through a screen is an operation nobody in the model consumes, and that is the normal case; who may call it is the security model's, and a maker-checker rule is an invariant in prose on the approving operation. The interview asks who calls it and the description records the answer (card 120 adds the question; decision 28 claimed it before the playbook had it).
- Read models are query services, and the write side was unsaid: a policy of the context reacts to the events that feed the view and issues an internal operation that writes what the query later reads.

## Note (2026-09-10, after card 117)

The fifth model ran: one modelling mistake, two rules worked around, none believed wrong, and both worked-around shapes were the ones the brief had named as things the author was free to do, which the interviews show being recited back. The exemptions held; the test was weaker than a blind one because the brief named the shapes. A second blind model, if one is ever needed, is briefed with the domain only.

## Note (2026-09-10, second)

The section "Rules carry no comments" listed the seams as consumables, consumptions and relationships and left out processes, which decision 23 gave `comments` and `disposition`; the list is all four.
