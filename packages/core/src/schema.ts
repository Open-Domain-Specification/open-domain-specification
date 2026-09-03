/**
 * @title Attribute
 * @description A named, typed property of an entity, value object or schema.
 */
export interface AttributeSchema {
	name: string;
	/** Free-form type name, e.g. `string`, `Money`, `Date`. */
	type: string;
	description?: string;
	/** True when this attribute is (part of) the identity of an entity. */
	identity?: boolean;
	/** The value object that models this attribute's type, when there is one. */
	valueobject?: { $ref: string };
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
	entities: { [entity: string]: EntitySchema };
	valueobjects: { [valueobject: string]: ValueObjectSchema };
	invariants: { [invariant: string]: InvariantSchema };
	provides: { [consumable: string]: ConsumableSchema };
	consumes: ConsumptionSchema[];
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
	/** The event consumables that trigger this policy. */
	on: { $ref: string }[];
	/** The operation consumables this policy issues. */
	then: { $ref: string }[];
}

/**
 * @title BoundedContext
 * @description Represents a bounded context in the Open Domain Specification (ODS).
 */
export interface BoundedContextSchema {
	name: string;
	description: string;
	/** The subdomains this context serves; a context may serve several. */
	subdomains: { $ref: string }[];
	/**
	 * Marks a context whose model is not coherent (typically legacy) so that
	 * neighbours know to protect themselves from it.
	 */
	bigBallOfMud?: boolean;
	/** The team that owns this context. */
	team?: { $ref: string };
	aggregates: { [aggregate: string]: AggregateSchema };
	services: { [service: string]: ServiceSchema };
	policies: { [policy: string]: PolicySchema };
	glossary: { [term: string]: GlossaryTermSchema };
	/** Payload shapes this context publishes or accepts, referenced by its consumables. */
	schemas: { [schema: string]: DataSchemaSchema };
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
	/** The payload shape, one of the context's schemas. */
	schema?: { $ref: string };
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
	attributes: { [attribute: string]: AttributeSchema };
	relations: EntityRelationSchema[];
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
}

/**
 * @title Invariant
 * @description Represents an invariant in the Open Domain Specification (ODS).
 */
export interface InvariantSchema {
	name: string;
	description: string;
	/** The entities, value objects or attributes this invariant constrains. */
	constrains: { $ref: string }[];
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
	provides: { [consumable: string]: ConsumableSchema };
	consumes: ConsumptionSchema[];
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
	attributes: { [attribute: string]: AttributeSchema };
	relations: EntityRelationSchema[];
}

/**
 * @title Workspace
 * @description Represents a workspace in the Open Domain Specification (ODS).
 */
export interface WorkspaceSchema {
	/** Location of the JSON schema this document conforms to, usually the schema.json beside it. Ignored by the loader. */
	$schema?: string;
	id: string;
	odsVersion: `${number}.${number}.${number}`;
	name: string;
	homepage?: string;
	logoUrl?: string;
	primaryColor?: string;
	description: string;
	version: string;
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

export function valueObjectRef(
	boundedcontext: string,
	aggregate: string,
	valueobject: string,
) {
	const { $ref } = aggregateRef(boundedcontext, aggregate);

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
