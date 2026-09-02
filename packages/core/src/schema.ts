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
 * @title BoundedContext
 * @description Represents a bounded context in the Open Domain Specification (ODS).
 */
export interface BoundedContextSchema {
	name: string;
	description: string;
	/** The subdomains this context serves; a context may serve several. */
	subdomains: { $ref: string }[];
	aggregates: { [aggregate: string]: AggregateSchema };
	services: { [service: string]: ServiceSchema };
}

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
	/** The upstream role this consumable is offered under. */
	pattern?: UpstreamRole;
}

/**
 * @title Consumption
 * @description Represents a consumption in the Open Domain Specification (ODS).
 */
export interface ConsumptionSchema {
	consumable: { $ref: string };
	/** The downstream role the consumer adopts for this consumable. */
	pattern?: DownstreamRole;
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
}

/**
 * @title SymmetricContextRelationship
 * @description A relationship between two bounded contexts with no upstream or downstream side.
 */
export interface SymmetricContextRelationshipSchema {
	type: SymmetricRelationshipType;
	participants: [{ $ref: string }, { $ref: string }];
	description?: string;
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
	relations: EntityRelationSchema[];
}

export type EntityRelationType = "references" | "includes" | "uses";

export enum RelationType {
	References = "references",
	Includes = "includes",
	Uses = "uses",
}

export interface EntityRelationSchema {
	target: { $ref: string };
	relation: EntityRelationType;
	label?: string;
}

/**
 * @title Invariant
 * @description Represents an invariant in the Open Domain Specification (ODS).
 */
export interface InvariantSchema {
	name: string;
	description: string;
}

export type ServiceType = "application" | "domain" | "infrastructure";

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
	relations: EntityRelationSchema[];
}

/**
 * @title Workspace
 * @description Represents a workspace in the Open Domain Specification (ODS).
 */
export interface WorkspaceSchema {
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
