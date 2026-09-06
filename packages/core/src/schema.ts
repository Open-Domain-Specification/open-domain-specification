/**
 * @title Attribute
 * @description A named, typed property of an entity, value object or schema.
 */
export interface AttributeSchema {
	name: string;
	/** Free-form type name, e.g. `string`, `Money`, `Date`. */
	type: string;
	description?: string;
	/**
	 * True when this attribute is (part of) the identity of an entity: the
	 * thing that tells one instance from another that holds the same values,
	 * and what `root-identity` and `entity-identity` look for.
	 *
	 * On a value object it is refused (`value-object-shape`): a value is what
	 * it holds and has nothing to be identified by. On a schema it says which
	 * field of the payload is the key a reader correlates on — the order number
	 * in an `OrderPlaced`, the instruction id in a settlement message — which is
	 * a fact about the payload and not a claim that the publishing context holds
	 * anything. That is why an identity on a schema attribute draws no edge on
	 * the context map and asks for no relationship: the payload carries the id
	 * for its reader, and the context owes the other nothing for it (decision
	 * 14, second amendment). Where the id belongs to another context, say so
	 * with `identifies` beside it.
	 */
	identity?: boolean;
	/**
	 * True when the attribute is sometimes absent. Left off means required,
	 * which is the common case and stays unwritten (decision 24). An identity
	 * attribute is never optional.
	 */
	optional?: boolean;
	/** The value object that models this attribute's type, when there is one. */
	valueobject?: { $ref: string };
	/**
	 * The schema that models this attribute's type, when the attribute is a
	 * shape of its own: the lines of an order, the address inside a customer.
	 * Mutually exclusive with `valueobject`; a collection stays in the type
	 * string (`OrderLine[]`).
	 */
	schema?: { $ref: string };
	/**
	 * What this attribute holds the identity of, when it is an identity of
	 * something else: `Order.petId` identifies Catalog's `Pet`. The target may
	 * be in another bounded context — that is the point, since an identity is
	 * the only thing that crosses a boundary (decision 14) — and there it may
	 * be a child rather than a root, since a session holds the id of a profile
	 * inside a household; the child is reached through its own root. The same
	 * goes inside one context: a shipment holds an order's id and its line's id
	 * beside it, which is how the model points at a child without the relation
	 * `cross-aggregate-reference` refuses (`identifies-entity`).
	 *
	 * It may also be a bounded context flagged `external` or `bigBallOfMud`: a
	 * card scheme's authorisation id belongs to a system whose entities are not
	 * ours to state, and a legacy account key belongs to one nobody can read
	 * well enough to say which entity it is of (decision 28), so the attribute
	 * names the system instead of an entity inside it.
	 *
	 * Or a schema an `external` context publishes, where that system documents
	 * the kind the id names: a processor's Customer, Payment, Refund and
	 * Dispute are distinct kinds with distinct ids, and the identity says which
	 * of them it holds while still reading as an identity into that context
	 * (decision 28, third amendment). Any other context is refused, and so is a
	 * schema of one, because there the entity exists and is what the id is of.
	 */
	identifies?: { $ref: string };
}

/**
 * @title DataSchema
 * @description A named payload shape owned by a bounded context, shared by the consumables that carry it.
 */
export interface DataSchemaSchema {
	name: string;
	description?: string;
	attributes: { [attribute: string]: AttributeSchema };
}

/**
 * @title Aggregate
 * @description Represents an aggregate in the Open Domain Specification (ODS).
 */
export interface AggregateSchema {
	name: string;
	description: string;
	/**
	 * The entities inside this aggregate, by id. Optional, like every map of
	 * elements in this schema: an absent map is an empty one.
	 */
	entities?: { [entity: string]: EntitySchema };
	invariants?: { [invariant: string]: InvariantSchema };
	provides?: { [consumable: string]: ConsumableSchema };
	/** What this aggregate consumes. Optional, like every list in this schema: an absent list is an empty one. */
	consumes?: ConsumptionSchema[];
}

/**
 * @title Team
 * @description A team that owns one or more bounded contexts.
 */
export interface TeamSchema {
	name: string;
	description?: string;
	homepage?: string;
}

/**
 * @title GlossaryTerm
 * @description A term of the ubiquitous language of a bounded context.
 */
export interface GlossaryTermSchema {
	name: string;
	definition: string;
	aliases?: string[];
	/** The model element that embodies this term, when there is one. */
	embodiedBy?: { $ref: string };
}

/**
 * @title Policy
 * @description A reaction: when these events happen, issue these commands.
 */
export interface PolicySchema {
	name: string;
	description: string;
	/**
	 * What triggers this policy: an event consumable, or an answer of an
	 * operation this context consumes, which means "when that answer comes
	 * back". An answer is named by its origin — `<operation ref>/returns`,
	 * `<operation ref>/rejects/<schema id>`, `<operation
	 * ref>/rejects/<schema id>/<reason>` for one enumerated outcome of that
	 * refusal, or `<operation ref>/completed` for an operation that returns
	 * nothing and whose completion is all there is to wait on — and never by
	 * the shape alone, so two operations refusing with one schema wake only
	 * whoever named the call that was made. The answer is synchronous because
	 * the operation is, so nothing else says so (decision 23).
	 */
	on?: { $ref: string }[];
	/** The operation consumables this policy issues. Optional, like every list in this schema: an absent list is an empty one. */
	then?: { $ref: string }[];
}

/**
 * @title Deadline
 * @description A time limit a process keeps on its own instances: cancel the reservation if nobody has paid after thirty minutes. It behaves as an event the process raises to itself, so the process may wait on it or end on it, and nothing else may name it. A per-instance timer is not a calendar event, so it needs no Clock context (decision 23, fourth amendment).
 */
export interface DeadlineSchema {
	name: string;
	description: string;
	/**
	 * How long the instance waits before the deadline falls, in the words the
	 * business uses: "30 minutes", "two working days". Free text, like an
	 * attribute's type: the model says the limit exists and how long it is, and
	 * leaves the arithmetic to the code (decision 15).
	 */
	after: string;
	/**
	 * The trigger the interval counts from: one of the process's own `starts`
	 * or `on` entries, named the same way those name one. Absent means from the
	 * moment the instance began.
	 *
	 * A clock has an anchor as well as a length, and which fact starts it is
	 * the business's own rule: a statutory decision window runs from the
	 * application's receipt, a delivery window from the dispatch, a chaser from
	 * the last time anybody wrote. Pausing a clock stays prose in the
	 * description — the model says when a clock starts and how long it runs,
	 * not the conditions that stop it (decision 23, fifth amendment).
	 */
	from?: { $ref: string };
}

/**
 * @title Process
 * @description A long-running reaction that holds state across events: it remembers which of its events have arrived and acts when enough of them have. What it correlates on, how long it waits and what it undoes are prose in its description rather than fields, because the model says that a process exists and what it listens to and does; how it decides is the code's (decisions 15 and 23).
 */
export interface ProcessSchema {
	name: string;
	description: string;
	/**
	 * What begins an instance of this process: an event consumable, or an
	 * operation of the process's own context — the command that creates one.
	 *
	 * A command starts a saga as often as an event does: "open a claim", "start
	 * an onboarding", "submit an application for a decision". The earlier
	 * reading allowed only an event, on the argument that something was already
	 * waiting for whatever starts an instance; that argument is about answers,
	 * where a caller has to have made the call, and it was overapplied to
	 * commands, which nobody has to be waiting for (decision 23, third
	 * amendment).
	 *
	 * A starting command belongs to this process's own context, for the reason
	 * `then` does: a process that claimed a neighbour's operation created its
	 * instances would be acting through somebody else's model. An answer and a
	 * deadline still start nothing, because in both cases the instance had to
	 * exist before to have been waiting.
	 *
	 * Optional, like every list in this schema: an absent list is an empty
	 * one. `process-starts` still asks for at least one, and reports it as a
	 * validation error rather than a schema one, so a file that omits `starts`
	 * loads and is then told what it is missing.
	 */
	starts?: { $ref: string }[];
	/**
	 * Further event consumables the process waits for or reacts to while an
	 * instance is alive, and the answers it waits to come back: an answer of an
	 * operation this context consumes, named by its origin the way a policy's
	 * `on` names one — including the bare completion of an operation that
	 * returns nothing — means "when that answer comes back", which is the
	 * call-and-branch a process manager is usually made of. Like a policy's
	 * `on`, one of these may belong to another context: subscribing to a
	 * published fact, or calling out and waiting, is how contexts integrate
	 * (decision 23).
	 */
	on?: { $ref: string }[];
	/** The operation consumables of this process's own context that it issues. Optional, like every list in this schema: an absent list is an empty one. */
	then?: { $ref: string }[];
	/**
	 * What completes an instance: an event consumable, an answer, or a deadline
	 * named the same way `on` names one. Optional, like every list in this
	 * schema: an absent list is an empty one.
	 */
	ends?: { $ref: string }[];
	/**
	 * The time limits this process keeps on its own instances, by id. A
	 * deadline is an element of the process, so `on` and `ends` name one by
	 * `<process ref>/deadlines/<id>` and nothing outside the process may name
	 * it at all (decision 23, fourth amendment).
	 */
	deadlines?: { [deadline: string]: DeadlineSchema };
	/** Grounded statements about the real system behind this process. */
	comments?: Comment[];
	/** What the architecture thinks of this process. Absent means `by-design`. */
	disposition?: Disposition;
}

/**
 * @title BoundedContext
 * @description Represents a bounded context in the Open Domain Specification (ODS).
 */
export interface BoundedContextSchema {
	name: string;
	description: string;
	/**
	 * The subdomains this context serves; a context may serve several.
	 * Optional, like every list in this schema: an absent list is an empty
	 * one, and `context-serves-subdomain` says so as a warning rather than the
	 * loader refusing the file.
	 */
	subdomains?: { $ref: string }[];
	/**
	 * Marks a context whose model is not coherent (typically legacy) so that
	 * neighbours know to protect themselves from it. It is still the
	 * enterprise's own system, so it may state aggregates, rules and reactions
	 * and every rule about what it does state applies; what it cannot be held
	 * to is completeness. Never `external` as well: that one is somebody else's
	 * machine, and the two say opposite things about who may change it
	 * (`external-is-boundary`).
	 */
	bigBallOfMud?: boolean;
	/**
	 * Marks a system the enterprise does not own and does not model inside: a
	 * card scheme, a payment provider, a licensor, a regulator, a clock. An
	 * external context provides and consumes consumables and takes part in
	 * relationships, and it needs no subdomain, no team and no internals —
	 * `external-is-boundary` refuses aggregates, policies and processes on it,
	 * because what happens inside it is not ours to state. What it publishes is
	 * a different matter: its value objects may carry invariants — an IBAN's
	 * checksum, an ISO 20022 field rule — and it may state a context invariant
	 * marked `precondition` or `postcondition` on one of its own operations,
	 * which is that operation's published contract. An invariant with neither
	 * flag, or one guarding another context's operation, is still refused
	 * (decision 28).
	 */
	external?: boolean;
	/** The team that owns this context. */
	team?: { $ref: string };
	/**
	 * The aggregates of this context, by id. Optional, and an absent map is an
	 * empty one — as every map of elements in this schema is, so that a file
	 * states what a context has and writes nothing at all for what it has not
	 * (card 104).
	 */
	aggregates?: { [aggregate: string]: AggregateSchema };
	/**
	 * The rules that hold across the instances or the aggregates of this
	 * context: uniqueness, quotas, limits, conservation. Each one names at
	 * least one operation of the context that guards it, because a rule no
	 * single instance can see is kept true only by whoever checks it before
	 * acting (decision 27).
	 */
	invariants?: { [invariant: string]: InvariantSchema };
	services?: { [service: string]: ServiceSchema };
	policies?: { [policy: string]: PolicySchema };
	/**
	 * The processes this context runs: the reactions that hold state across
	 * events, waiting for several of them before they act and knowing how they
	 * finish. A policy that finds itself waiting for a second event is one of
	 * these (decision 23).
	 */
	processes?: { [process: string]: ProcessSchema };
	glossary?: { [term: string]: GlossaryTermSchema };
	/**
	 * The values this context defines once: part of its ubiquitous language,
	 * referenced by the attributes and relations of any of its aggregates.
	 */
	valueobjects?: { [valueobject: string]: ValueObjectSchema };
	/** Payload shapes this context publishes or accepts, referenced by its consumables. */
	schemas?: { [schema: string]: DataSchemaSchema };
}

/** What a comment's link points at. */
export type CommentLinkKind =
	| "code"
	| "contract"
	| "adr"
	| "runbook"
	| "dashboard";

/**
 * @title CommentLink
 * @description Where the evidence for a comment lives: the code, the contract, the decision record, the runbook or the dashboard.
 */
export interface CommentLink {
	kind: CommentLinkKind;
	url: string;
	/** What to show instead of the raw URL. */
	label?: string;
}

/**
 * @title Comment
 * @description A short grounded statement about the real system behind a strategic intent, optionally backed by one link.
 */
export interface Comment {
	text: string;
	link?: CommentLink;
}

/**
 * What the architecture thinks of a strategic intent: `by-design` is how it
 * should be, `tolerated` a known compromise nobody plans to change, and
 * `refactor` something that should be removed or replaced. An absent
 * disposition means `by-design`.
 */
export type Disposition = "by-design" | "tolerated" | "refactor";

/** How an upstream context exposes what it provides. */
export type UpstreamRole = "open-host-service" | "published-language";

/** How a downstream context protects itself from what it consumes. */
export type DownstreamRole = "conformist" | "anti-corruption-layer";

export type ConsumableType = "event" | "operation";

/**
 * @title Consumable
 * @description Represents a consumable in the Open Domain Specification (ODS).
 */
export interface ConsumableSchema {
	name: string;
	description: string;
	type: ConsumableType;
	/** The upstream role this consumable is offered under. Absent on internal consumables. */
	pattern?: UpstreamRole;
	/**
	 * True when the consumable stays inside its context: an event only local
	 * policies react to, or an operation only local callers issue. Internal
	 * consumables may not be consumed from another context.
	 */
	internal?: boolean;
	/**
	 * The payload the caller sends, one of the context's schemas.
	 *
	 * `many` says the request is a list of that shape rather than one of it:
	 * Swagger's `createUsersWithList` takes a root array of users. A named
	 * collection and an object holding one are different shapes, and the
	 * argument that gave `returns` its `many` is the same one here (decision
	 * 13, amended). A wrapper stays where the request really is an object with
	 * a list among its attributes.
	 */
	schema?: { $ref: string; many?: boolean };
	/**
	 * For operations: the payload shape the caller gets back, one of the
	 * context's schemas. Absent means the operation returns nothing worth
	 * naming, which is honest for commands. Never valid on an event.
	 *
	 * `many` says the answer is a list of that shape rather than one of it: a
	 * search answers with the matches it found. A named collection and an
	 * object holding one are different shapes, and a wrapper schema said the
	 * wrong one — a consumer of `Pets { pets: PetSummary[] }` could not tell
	 * that the call really answers with a root array (decision 13, amended).
	 * A wrapper stays where the answer really is an object with a list among
	 * its attributes, as search results with a total and hits are.
	 */
	returns?: { $ref: string; many?: boolean };
	/**
	 * For operations: the shapes the operation answers with when it refuses,
	 * each one of the context's schemas. A rejection is not an event, because
	 * nothing happened, and not a transport error, which stays outside the
	 * model. Absent means the operation either always succeeds or refuses
	 * without a domain-meaningful shape. Never valid on an event.
	 *
	 * `reasons` are the enumerated outcomes of that shape as the contract
	 * states them — an acquirer's decline codes, ISO 8583 response codes —
	 * each one an answer a reactor may wait on, `<operation ref>/rejects/<schema
	 * id>/<reason>`, alongside the shape-level answer that hears them all. A
	 * reason is a named outcome the contract states and not a condition on
	 * data, which stays out of the model (decisions 25, amended, and 15).
	 */
	rejects?: { $ref: string; reasons?: string[] }[];
	/** For operations: the event consumables this operation may raise. */
	raises?: { $ref: string }[];
	/** Grounded statements about the real system behind this consumable. */
	comments?: Comment[];
	/** What the architecture thinks of this consumable. Absent means `by-design`. */
	disposition?: Disposition;
}

/**
 * @title Consumption
 * @description Represents a consumption in the Open Domain Specification (ODS).
 */
export interface ConsumptionSchema {
	consumable: { $ref: string };
	/** The downstream role the consumer adopts for this consumable. */
	pattern?: DownstreamRole;
	/**
	 * The consumer's own operations or policies that make this exchange, when
	 * only some of them do: a subscription service consumes a payment gateway
	 * when it renews, not when it lists entitlements.
	 *
	 * Absent means the whole consumer, which is fine for a consumer that
	 * provides one operation, or none, because there is nothing to choose
	 * between. A consumer with two or more names which of them makes the call,
	 * and `consumption-by-required` asks for it: `by` is the one causal link
	 * the model has from one operation to the next, so without it the reaction
	 * walk and the flow map stop at the boundary and an answer reaches nobody
	 * (decision 21).
	 */
	by?: { $ref: string }[];
	/**
	 * The directed relationship this exchange belongs to, where the pair holds
	 * more than one agreement in that direction: a call made under the
	 * negotiated fulfilment API rather than under the tolerated legacy feed
	 * beside it.
	 *
	 * Absent is the common case, one agreement between the pair, and the
	 * exchange belongs to it. Where the pair holds two, an exchange that names
	 * neither belongs to nothing a rule can read, and `consumption-agreement`
	 * says so (decision 15's amendment of 2026-09-10).
	 */
	relationship?: { $ref: string };
	/** Grounded statements about the real system behind this consumption. */
	comments?: Comment[];
	/** What the architecture thinks of this consumption. Absent means `by-design`. */
	disposition?: Disposition;
}

/**
 * Relationships with a clear upstream and downstream side. `customer-supplier`
 * is an upstream/downstream relationship where the downstream team has a say
 * in the upstream's planning.
 */
export type DirectedRelationshipType =
	| "upstream-downstream"
	| "customer-supplier";

/**
 * Relationships without a direction: teams share a kernel, work as partners,
 * or deliberately do not integrate at all.
 */
export type SymmetricRelationshipType =
	| "partnership"
	| "shared-kernel"
	| "separate-ways";

export type ContextRelationshipType =
	| DirectedRelationshipType
	| SymmetricRelationshipType;

/**
 * @title DirectedContextRelationship
 * @description An upstream/downstream relationship between two bounded contexts.
 */
export interface DirectedContextRelationshipSchema {
	type: DirectedRelationshipType;
	/**
	 * What this agreement is called, where one pair holds more than one in the
	 * same direction: a negotiated fulfilment API beside a tolerated legacy
	 * feed from the same warehouse, each with its own roles, comments and
	 * disposition.
	 *
	 * Absent is the common case, one agreement between the pair, and the ref
	 * stays what it always was. Where it is present the name is appended to the
	 * ref, so the two are separately reachable and a diagnostic about one is
	 * not read as a diagnostic about the other; the map draws two lines and
	 * labels each with its name. Two agreements between one pair in one
	 * direction that are both unnamed, or share a name, are one declaration
	 * made twice and `relationship-duplicate` refuses them (decision 15).
	 */
	name?: string;
	upstream: { $ref: string };
	downstream: { $ref: string };
	upstreamRoles: UpstreamRole[];
	downstreamRoles: DownstreamRole[];
	description?: string;
	/** Grounded statements about the real system behind this relationship. */
	comments?: Comment[];
	/** What the architecture thinks of this relationship. Absent means `by-design`. */
	disposition?: Disposition;
}

/**
 * @title SymmetricContextRelationship
 * @description A relationship between two bounded contexts with no upstream or downstream side.
 */
export interface SymmetricContextRelationshipSchema {
	type: SymmetricRelationshipType;
	/**
	 * What this agreement is called, where one pair holds more than one in the
	 * same direction: a negotiated fulfilment API beside a tolerated legacy
	 * feed from the same warehouse, each with its own roles, comments and
	 * disposition.
	 *
	 * Absent is the common case, one agreement between the pair, and the ref
	 * stays what it always was. Where it is present the name is appended to the
	 * ref, so the two are separately reachable and a diagnostic about one is
	 * not read as a diagnostic about the other; the map draws two lines and
	 * labels each with its name. Two agreements between one pair in one
	 * direction that are both unnamed, or share a name, are one declaration
	 * made twice and `relationship-duplicate` refuses them (decision 15).
	 */
	name?: string;
	participants: [{ $ref: string }, { $ref: string }];
	description?: string;
	/** Grounded statements about the real system behind this relationship. */
	comments?: Comment[];
	/** What the architecture thinks of this relationship. Absent means `by-design`. */
	disposition?: Disposition;
}

/**
 * @title ContextRelationship
 * @description A strategic relationship between two bounded contexts.
 */
export type ContextRelationshipSchema =
	| DirectedContextRelationshipSchema
	| SymmetricContextRelationshipSchema;

/**
 * Strategic classification of a subdomain: the part of the problem space
 * the business competes on (core), needs but does not differentiate on
 * (supporting), or can buy off the shelf (generic).
 */
export type SubdomainType = "core" | "supporting" | "generic";

/**
 * @title Domain
 * @description Represents a domain in the Open Domain Specification (ODS).
 */
export interface DomainSchema {
	name: string;
	description: string;
	subdomains: {
		[subdomain: string]: SubdomainSchema;
	};
}

/**
 * @title Entity
 * @description Represents an entity in the Open Domain Specification (ODS).
 */
export interface EntitySchema {
	root?: boolean;
	name: string;
	description: string;
	/**
	 * The entity this one is a kind of: it has every attribute and relation of
	 * that entity, plus its own. The target is an entity of the same
	 * aggregate, and a subtype is never itself the root, because the aggregate
	 * has one root and a kind of it is reached through it (decision 22).
	 */
	specialises?: { $ref: string };
	attributes: { [attribute: string]: AttributeSchema };
	/** What this entity points at; empty when left out. */
	relations?: EntityRelationSchema[];
}

export type EntityRelationType = "references" | "includes" | "uses";

export enum RelationType {
	References = "references",
	Includes = "includes",
	Uses = "uses",
}

/** How many targets one source relates to, in UML multiplicity notation. */
export type RelationCardinality = "1" | "0..1" | "*" | "1..*";

export interface EntityRelationSchema {
	target: { $ref: string };
	relation: EntityRelationType;
	label?: string;
	cardinality?: RelationCardinality;
	/**
	 * The attribute of the source this relation draws, named where the source
	 * uses one value object for more than one attribute: a customer's current
	 * address beside its address history. The label stays the phrase the
	 * relation map reads ("lives at", "in arrears of"); this is the field it
	 * belongs to. Absent where the source uses the target once, which is the
	 * common case.
	 */
	for?: string;
}

/**
 * @title Invariant
 * @description A rule that holds by construction of a value object, inside an aggregate on every save, or across the instances and aggregates of a bounded context.
 */
export interface InvariantSchema {
	name: string;
	description: string;
	/**
	 * What this invariant is a rule about: the entities, value objects and
	 * attributes it holds over, and the operations it constrains, for a rule
	 * about what an operation may do. A value object's invariant reaches its
	 * own attributes and nothing else; an aggregate's reaches inside its own
	 * aggregate and the value objects of its context; a context's reaches
	 * anywhere in the context and names at least one operation that guards it.
	 *
	 * An aggregate's invariant naming a value object means that aggregate's
	 * instances of it — the amounts this payment holds, not every Money in the
	 * context — because what is saved with an aggregate is the value, not the
	 * definition. A rule about every instance of a value wherever it is held is
	 * the value's own invariant, and a rule across the instances of several
	 * aggregates is the context's (decisions 16 and 27).
	 *
	 * Naming an operation says which operation keeps the rule, not what kind of
	 * rule it is: `precondition` says that.
	 *
	 * A precondition may also name attributes of a schema its guarded operation
	 * takes, returns or rejects with: pickup before delivery, a positive
	 * weight, on a quotation no aggregate yet holds. The check reads the
	 * request, so the request is what the rule is about. A postcondition
	 * reaches the answer only — the shapes its guarded operation returns or
	 * rejects with — because that is what it is a guarantee about. Either may
	 * follow composition: an attribute of any schema reachable from those
	 * through `attribute.schema` is one of the fields the call carries, so a
	 * rule about the amount of an order line is a rule about the request that
	 * holds the lines. An invariant that is neither may name no schema
	 * attribute at all, because a rule kept true on every save is a rule about
	 * the model and not about a transport shape (decision 19, amended).
	 */
	constrains: { $ref: string }[];
	/**
	 * Whether this rule is a precondition: checked before the operation it
	 * names runs, and not kept true afterwards — enough funds at initiation, an
	 * entitlement at playback start, a pet still available at approval. What it
	 * was checked against may move on the moment the call returns, so nothing
	 * re-establishes it.
	 *
	 * Absent or false means the operations it names keep it and it is still
	 * true after them: `PostEntry` must produce balanced postings and the
	 * postings stay balanced. A precondition names the operation it guards
	 * (`precondition-names-operation`), because a check before nothing in
	 * particular is a check nowhere (decision 27, second amendment).
	 */
	precondition?: boolean;
	/**
	 * Whether this rule is a postcondition: a guarantee about what an operation
	 * answers with — every returned itinerary meets the requested deadline,
	 * every quoted premium is within the band the schedule allows.
	 *
	 * It is neither a persistent invariant nor a precondition. The answer does
	 * not exist before the call runs, so nothing can be checked beforehand, and
	 * it is not saved anywhere afterwards, so no aggregate keeps it true. What
	 * holds it is the operation, every time it answers, which is why a
	 * postcondition names the operation it is about
	 * (`postcondition-names-operation`) and may constrain the attributes of
	 * what that operation returns or rejects with (decision 19, third
	 * amendment).
	 *
	 * Exclusive with `precondition`: a rule is checked before a call or
	 * guaranteed of what comes back, and one marked both says two different
	 * things about when it holds.
	 */
	postcondition?: boolean;
}

/**
 * Application services orchestrate use cases and expose them to the outside;
 * domain services hold domain logic that belongs to no single aggregate.
 * Infrastructure is an implementation concern and is not modelled.
 */
export type ServiceType = "application" | "domain";

/**
 * @title Service
 * @description Represents a service in the Open Domain Specification (ODS).
 */
export interface ServiceSchema {
	type: ServiceType;
	name: string;
	description: string;
	provides?: { [consumable: string]: ConsumableSchema };
	/** What this service consumes. Optional, like every list in this schema: an absent list is an empty one. */
	consumes?: ConsumptionSchema[];
}

/**
 * @title Subdomain
 * @description Represents a subdomain in the Open Domain Specification (ODS).
 */
export interface SubdomainSchema {
	name: string;
	type: SubdomainType;
	description: string;
}

/**
 * @title ValueObject
 * @description Represents a value object in the Open Domain Specification (ODS).
 */
export interface ValueObjectSchema {
	name: string;
	description: string;
	/**
	 * The value object this one is a kind of: it has every attribute and
	 * relation of that value object, plus its own. The target belongs to this
	 * context, or to a context this one shares a kernel with (decision 22).
	 */
	specialises?: { $ref: string };
	/** This value's own attributes, by id. An absent map is an empty one, like every map of elements in this schema. */
	attributes?: { [attribute: string]: AttributeSchema };
	/** What this value points at; empty when left out. */
	relations?: EntityRelationSchema[];
	/**
	 * The rules that hold of every instance of this value: a Money's two
	 * amounts in one currency, an IBAN's mod-97 checksum. Such a rule holds by
	 * construction — a value that breaks it is never made — so it constrains
	 * this value's own attributes and needs no operation to guard it
	 * (decision 27). Optional, and an absent map is an empty one, like every
	 * map of elements in this schema.
	 */
	invariants?: { [invariant: string]: InvariantSchema };
}

/**
 * @title RuleOptions
 * @description Opt-in validation rules. A rule listed here is off unless the workspace turns it on.
 */
export interface RuleOptionsSchema {
	/** Warn on every context relationship that carries no comments. Off by default. */
	commentsRequired?: boolean;
}

/**
 * @title WorkspaceOptions
 * @description Per-workspace switches for behaviour that is not part of the model itself.
 */
export interface WorkspaceOptionsSchema {
	rules?: RuleOptionsSchema;
}

/**
 * The version of the ODS metamodel this core reads and writes.
 *
 * It is a constant of the library rather than something an author sets: every
 * file core writes carries it, and a file that carries a different major was
 * written against a metamodel this core does not read the same way. The major
 * is bumped by the decision that breaks the metamodel — this is `2.0.0` for
 * everything since the version started being compared at all, because the
 * five decisions that promised the bump never got one (decision 29, noted
 * 2026-09-10). The `ods-version` rule is where a mismatch is reported.
 */
export const ODS_VERSION = "2.0.0" as const;

/**
 * @title Workspace
 * @description Represents a workspace in the Open Domain Specification (ODS).
 */
export interface WorkspaceSchema {
	/** Location of the JSON schema this document conforms to, usually the schema.json beside it. Ignored by the loader. */
	$schema?: string;
	id: string;
	/**
	 * The version of the ODS metamodel this file was written against, which
	 * core writes and nobody edits by hand. Its major is bumped by the decision
	 * that breaks the metamodel, so a file whose major differs from the reading
	 * core's was written against a different model; `ods-version` says so and
	 * the file still loads what it can. A file that states none is older than
	 * the version being written at all, and gets the same diagnostic
	 * (decision 29, noted 2026-09-10).
	 */
	odsVersion?: `${number}.${number}.${number}`;
	name: string;
	homepage?: string;
	logoUrl?: string;
	primaryColor?: string;
	description: string;
	version: string;
	/** Switches for behaviour that is not part of the model, such as opt-in rules. */
	options?: WorkspaceOptionsSchema;
	domains: {
		[domain: string]: DomainSchema;
	};
	boundedcontexts: {
		[boundedcontext: string]: BoundedContextSchema;
	};
	relationships: ContextRelationshipSchema[];
	teams: {
		[team: string]: TeamSchema;
	};
}

export function teamRef(team: string) {
	return {
		$ref: `#/teams/${team}`,
	};
}

export function domainRef(domain: string) {
	return {
		$ref: `#/domains/${domain}`,
	};
}

export function subdomainRef(domain: string, subdomain: string) {
	const { $ref } = domainRef(domain);

	return {
		$ref: `${$ref}/subdomains/${subdomain}`,
	};
}

export function boundedcontextRef(boundedcontext: string) {
	return {
		$ref: `#/boundedcontexts/${boundedcontext}`,
	};
}

export function serviceRef(boundedcontext: string, service: string) {
	const { $ref } = boundedcontextRef(boundedcontext);

	return {
		$ref: `${$ref}/services/${service}`,
	};
}

export function termRef(boundedcontext: string, term: string) {
	const { $ref } = boundedcontextRef(boundedcontext);

	return {
		$ref: `${$ref}/glossary/${term}`,
	};
}

export function policyRef(boundedcontext: string, policy: string) {
	const { $ref } = boundedcontextRef(boundedcontext);

	return {
		$ref: `${$ref}/policies/${policy}`,
	};
}

export function processRef(boundedcontext: string, process: string) {
	const { $ref } = boundedcontextRef(boundedcontext);

	return {
		$ref: `${$ref}/processes/${process}`,
	};
}

export function aggregateRef(boundedcontext: string, aggregate: string) {
	const { $ref } = boundedcontextRef(boundedcontext);

	return {
		$ref: `${$ref}/aggregates/${aggregate}`,
	};
}

export function entityRef(
	boundedcontext: string,
	aggregate: string,
	entity: string,
) {
	const { $ref } = aggregateRef(boundedcontext, aggregate);

	return {
		$ref: `${$ref}/entities/${entity}`,
	};
}

export function valueObjectRef(boundedcontext: string, valueobject: string) {
	const { $ref } = boundedcontextRef(boundedcontext);

	return {
		$ref: `${$ref}/valueobjects/${valueobject}`,
	};
}

export function invariantRef(
	boundedcontext: string,
	aggregate: string,
	invariant: string,
) {
	const { $ref } = aggregateRef(boundedcontext, aggregate);

	return {
		$ref: `${$ref}/invariants/${invariant}`,
	};
}

/** The ref of an invariant a value object owns: a rule about its own attributes. */
export function valueObjectInvariantRef(
	boundedcontext: string,
	valueobject: string,
	invariant: string,
) {
	const { $ref } = valueObjectRef(boundedcontext, valueobject);

	return {
		$ref: `${$ref}/invariants/${invariant}`,
	};
}

/** The ref of an invariant a bounded context owns rather than an aggregate. */
export function contextInvariantRef(boundedcontext: string, invariant: string) {
	const { $ref } = boundedcontextRef(boundedcontext);

	return {
		$ref: `${$ref}/invariants/${invariant}`,
	};
}

export function schemaRef(boundedcontext: string, schema: string) {
	const { $ref } = boundedcontextRef(boundedcontext);

	return {
		$ref: `${$ref}/schemas/${schema}`,
	};
}

export function consumableRef(
	boundedcontext: string,
	provider: string,
	consumable: string,
	providerType: "service" | "aggregate",
) {
	const { $ref } =
		providerType === "aggregate"
			? aggregateRef(boundedcontext, provider)
			: serviceRef(boundedcontext, provider);

	return {
		$ref: `${$ref}/provides/${consumable}`,
	};
}
