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
	aggregates: { [aggregate: string]: AggregateSchema };
	services: { [service: string]: ServiceSchema };
}

export type ConsumablePattern =
	| "open-host-service"
	| "published-language"
	| "shared-kernel"
	| "customer-supplier";

export type ConsumableType = "event" | "operation";

/**
 * @title Consumable
 * @description Represents a consumable in the Open Domain Specification (ODS).
 */
export interface ConsumableSchema {
	name: string;
	description: string;
	type: ConsumableType;
	pattern: ConsumablePattern;
}

export type ConsumptionPattern =
	| "conformist"
	| "anti-corruption-layer"
	| "customer-supplier"
	| "partnership"
	| "separate-ways";

/**
 * @title Consumption
 * @description Represents a consumption in the Open Domain Specification (ODS).
 */
export interface ConsumptionSchema {
	consumable: { $ref: string };
	pattern: ConsumptionPattern;
}

export type DomainType = "core" | "supporting" | "generic";

/**
 * @title Domain
 * @description Represents a domain in the Open Domain Specification (ODS).
 */
export interface DomainSchema {
	name: string;
	type: DomainType;
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
	description: string;
	boundedcontexts: {
		[boundedcontext: string]: BoundedContextSchema;
	};
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

export function boundedcontextRef(
	domain: string,
	subdomain: string,
	boundedcontext: string,
) {
	const { $ref } = subdomainRef(domain, subdomain);

	return {
		$ref: `${$ref}/boundedcontexts/${boundedcontext}`,
	};
}

export function serviceRef(
	domain: string,
	subdomain: string,
	boundedcontext: string,
	service: string,
) {
	const { $ref } = boundedcontextRef(domain, subdomain, boundedcontext);

	return {
		$ref: `${$ref}/services/${service}`,
	};
}

export function aggregateRef(
	domain: string,
	subdomain: string,
	boundedcontext: string,
	aggregate: string,
) {
	const { $ref } = boundedcontextRef(domain, subdomain, boundedcontext);

	return {
		$ref: `${$ref}/aggregates/${aggregate}`,
	};
}

export function entityRef(
	domain: string,
	subdomain: string,
	boundedcontext: string,
	aggregate: string,
	entity: string,
) {
	const { $ref } = aggregateRef(domain, subdomain, boundedcontext, aggregate);

	return {
		$ref: `${$ref}/entities/${entity}`,
	};
}

export function valueObjectRef(
	domain: string,
	subdomain: string,
	boundedcontext: string,
	aggregate: string,
	valueobject: string,
) {
	const { $ref } = aggregateRef(domain, subdomain, boundedcontext, aggregate);

	return {
		$ref: `${$ref}/valueobjects/${valueobject}`,
	};
}

export function invariantRef(
	domain: string,
	subdomain: string,
	boundedcontext: string,
	aggregate: string,
	invariant: string,
) {
	const { $ref } = aggregateRef(domain, subdomain, boundedcontext, aggregate);

	return {
		$ref: `${$ref}/invariants/${invariant}`,
	};
}

export function consumableRef(
	domain: string,
	subdomain: string,
	boundedcontext: string,
	provider: string,
	consumable: string,
	providerType: "service" | "aggregate",
) {
	const { $ref } =
		providerType === "aggregate"
			? aggregateRef(domain, subdomain, boundedcontext, provider)
			: serviceRef(domain, subdomain, boundedcontext, provider);

	return {
		$ref: `${$ref}/provides/${consumable}`,
	};
}
