export type AggregateSchema = {
	name: string;
	description: string;
	entities: Record<string, EntitySchema>;
	valueobjects: Record<string, ValueObjectSchema>;
	invariants: Record<string, InvariantSchema>;
	provides: Record<string, ConsumableSchema>;
	consumes: ConsumptionSchema[];
};

export type BoundedContextSchema = {
	name: string;
	description: string;
	aggregates: Record<string, AggregateSchema>;
	services: Record<string, ServiceSchema>;
};

export type ConsumablePattern =
	| "open-host-service"
	| "published-language"
	| "shared-kernel"
	| "customer-supplier";

export type ConsumableType = "event" | "operation";

export type ConsumableSchema = {
	name: string;
	description: string;
	type: ConsumableType;
	pattern: ConsumablePattern;
};

export type ConsumptionPattern =
	| "conformist"
	| "anti-corruption-layer"
	| "customer-supplier"
	| "partnership"
	| "separate-ways";

export type ConsumptionSchema = {
	consumable: { $ref: string };
	pattern: ConsumptionPattern;
};

export type DomainType = "core" | "supporting" | "generic";

export type DomainSchema = {
	name: string;
	type: DomainType;
	description: string;
	subdomains: Record<string, SubdomainSchema>;
};

export type EntitySchema = {
	root?: boolean;
	name: string;
	description: string;
	relations: EntityRelationSchema[];
};

export type EntityRelationType = "references" | "includes" | "uses";

export enum RelationType {
	References = "references",
	Includes = "includes",
	Uses = "uses",
}

export type EntityRelationSchema = {
	target: { $ref: string };
	relation: EntityRelationType;
	label?: string;
};

export type InvariantSchema = {
	name: string;
	description: string;
};

export type ServiceType = "application" | "domain" | "infrastructure";

export type ServiceSchema = {
	type: ServiceType;
	name: string;
	description: string;
	provides: Record<string, ConsumableSchema>;
	consumes: ConsumptionSchema[];
};

export type SubdomainSchema = {
	name: string;
	description: string;
	boundedcontexts: Record<string, BoundedContextSchema>;
};

export type ValueObjectSchema = {
	name: string;
	description: string;
	relations: EntityRelationSchema[];
};

export type WorkspaceSchema = {
	id: string;
	odsVersion: `${number}.${number}.${number}`;
	name: string;
	homepage?: string;
	logoUrl?: string;
	primaryColor?: string;
	description: string;
	version: string;
	domains: Record<string, DomainSchema>;
};

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
