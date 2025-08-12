export type Aggregate = {
	id: string;
	name: string;
	description: string;
	entities: Record<string, Entity>;
	valueobjects: Record<string, ValueObject>;
	invariants: Record<string, Invariant>;
	provides: Record<string, Consumable>;
	consumes: Consumption[];
};

export type BoundedContext = {
	id: string;
	name: string;
	description: string;
	aggregates: Record<string, Aggregate>;
	services: Record<string, Service>;
};

export type ConsumablePattern =
	| "open-host-service"
	| "published-language"
	| "shared-kernel";

export type ConsumableType = "event" | "operation";

export type Consumable = {
	id: string;
	name: string;
	description: string;
	type: ConsumableType;
	pattern: ConsumablePattern;
};

export type ConsumptionPattern =
	| "conformist"
	| "anti-corruption-layer"
	| "customer-supplier"
	| "open-host"
	| "partnership"
	| "separate-ways";

export type Consumption = {
	consumable: { $ref: string };
	pattern: ConsumptionPattern;
};

export type DomainType = "core" | "supporting" | "generic";

export type Domain = {
	id: string;
	name: string;
	type: DomainType;
	description: string;
	subdomains: Record<string, Subdomain>;
};

export type Entity = {
	root?: boolean;
	id: string;
	name: string;
	description: string;
	relations: EntityRelation[];
};

export type ZeroOrOne_ZeroOrOne = "|o--o|";
export type ZeroOrOne_ExactlyOne = "|o--||";
export type ZeroOrOne_ZeroOrMore = "|o--o{";
export type ZeroOrOne_OneOrMore = "|o--|{";
export type ExactlyOne_ZeroOrOne = "||--o|";
export type ExactlyOne_ExactlyOne = "||--||";
export type ExactlyOne_ZeroOrMore = "||--o{";
export type ExactlyOne_OneOrMore = "||--|{";
export type ZeroOrMore_ZeroOrOne = "}o--o|";
export type ZeroOrMore_ExactlyOne = "}o--||";
export type ZeroOrMore_ZeroOrMore = "}o--o{";
export type ZeroOrMore_OneOrMore = "}o--|{";
export type OneOrMore_ZeroOrOne = "}|--o|";
export type OneOrMore_ExactlyOne = "}|--||";
export type OneOrMore_ZeroOrMore = "}|--o{";
export type OneOrMore_OneOrMore = "}|--|{";

export type ZeroOrOne_ZeroOrOne_Dashed = "|o..o|";
export type ZeroOrOne_ExactlyOne_Dashed = "|o..||";
export type ZeroOrOne_ZeroOrMore_Dashed = "|o..o{";
export type ZeroOrOne_OneOrMore_Dashed = "|o..|{";
export type ExactlyOne_ZeroOrOne_Dashed = "||..o|";
export type ExactlyOne_ExactlyOne_Dashed = "||..||";
export type ExactlyOne_ZeroOrMore_Dashed = "||..o{";
export type ExactlyOne_OneOrMore_Dashed = "||..|{";
export type ZeroOrMore_ZeroOrOne_Dashed = "}o..o|";
export type ZeroOrMore_ExactlyOne_Dashed = "}o..||";
export type ZeroOrMore_ZeroOrMore_Dashed = "}o..o{";
export type ZeroOrMore_OneOrMore_Dashed = "}o..|{";
export type OneOrMore_ZeroOrOne_Dashed = "}|..o|";
export type OneOrMore_ExactlyOne_Dashed = "}|..||";
export type OneOrMore_ZeroOrMore_Dashed = "}|..o{";
export type OneOrMore_OneOrMore_Dashed = "}|..{";

export type EntityRelationType =
	| ZeroOrOne_ZeroOrOne
	| ZeroOrOne_ExactlyOne
	| ZeroOrOne_ZeroOrMore
	| ZeroOrOne_OneOrMore
	| ExactlyOne_ZeroOrOne
	| ExactlyOne_ExactlyOne
	| ExactlyOne_ZeroOrMore
	| ExactlyOne_OneOrMore
	| ZeroOrMore_ZeroOrOne
	| ZeroOrMore_ExactlyOne
	| ZeroOrMore_ZeroOrMore
	| ZeroOrMore_OneOrMore
	| OneOrMore_ZeroOrOne
	| OneOrMore_ExactlyOne
	| OneOrMore_ZeroOrMore
	| OneOrMore_OneOrMore

	// Dashed syntax using dots
	| ZeroOrOne_ZeroOrOne_Dashed
	| ZeroOrOne_ExactlyOne_Dashed
	| ZeroOrOne_ZeroOrMore_Dashed
	| ZeroOrOne_OneOrMore_Dashed
	| ExactlyOne_ZeroOrOne_Dashed
	| ExactlyOne_ExactlyOne_Dashed
	| ExactlyOne_ZeroOrMore_Dashed
	| ExactlyOne_OneOrMore_Dashed
	| ZeroOrMore_ZeroOrOne_Dashed
	| ZeroOrMore_ExactlyOne_Dashed
	| ZeroOrMore_ZeroOrMore_Dashed
	| ZeroOrMore_OneOrMore_Dashed
	| OneOrMore_ZeroOrOne_Dashed
	| OneOrMore_ExactlyOne_Dashed
	| OneOrMore_ZeroOrMore_Dashed
	| OneOrMore_OneOrMore_Dashed;

export enum RelationType {
	ZeroOrOne_ZeroOrOne = "|o--o|",
	ZeroOrOne_ExactlyOne = "|o--||",
	ZeroOrOne_ZeroOrMore = "|o--o{",
	ZeroOrOne_OneOrMore = "|o--|{",
	ExactlyOne_ZeroOrOne = "||--o|",
	ExactlyOne_ExactlyOne = "||--||",
	ExactlyOne_ZeroOrMore = "||--o{",
	ExactlyOne_OneOrMore = "||--|{",
	ZeroOrMore_ZeroOrOne = "}o--o|",
	ZeroOrMore_ExactlyOne = "}o--||",
	ZeroOrMore_ZeroOrMore = "}o--o{",
	ZeroOrMore_OneOrMore = "}o--|{",
	OneOrMore_ZeroOrOne = "}|--o|",
	OneOrMore_ExactlyOne = "}|--||",
	OneOrMore_ZeroOrMore = "}|--o{",
	OneOrMore_OneOrMore = "}|--|{",
	ZeroOrOne_ZeroOrOne_Dashed = "|o..o|",
	ZeroOrOne_ExactlyOne_Dashed = "|o..||",
	ZeroOrOne_ZeroOrMore_Dashed = "|o..o{",
	ZeroOrOne_OneOrMore_Dashed = "|o..|{",
	ExactlyOne_ZeroOrOne_Dashed = "||..o|",
	ExactlyOne_ExactlyOne_Dashed = "||..||",
	ExactlyOne_ZeroOrMore_Dashed = "||..o{",
	ExactlyOne_OneOrMore_Dashed = "||..|{",
	ZeroOrMore_ZeroOrOne_Dashed = "}o..o|",
	ZeroOrMore_ExactlyOne_Dashed = "}o..||",
	ZeroOrMore_ZeroOrMore_Dashed = "}o..o{",
	ZeroOrMore_OneOrMore_Dashed = "}o..|{",
	OneOrMore_ZeroOrOne_Dashed = "}|..o|",
	OneOrMore_ExactlyOne_Dashed = "}|..||",
	OneOrMore_ZeroOrMore_Dashed = "}|..o{",
	OneOrMore_OneOrMore_Dashed = "}|..|{",
}

export type EntityRelation = {
	target: { $ref: string };
	relation: EntityRelationType;
	label?: string;
};

export type Invariant = {
	id: string;
	name: string;
	description: string;
};

export type ServiceType = "application" | "domain" | "infrastructure";

export type Service = {
	id: string;
	type: ServiceType;
	name: string;
	description: string;
	provides: Record<string, Consumable>;
	consumes: Consumption[];
};

export type Subdomain = {
	id: string;
	name: string;
	description: string;
	boundedcontexts: Record<string, BoundedContext>;
};

export type ValueObject = {
	id: string;
	name: string;
	description: string;
	relations: EntityRelation[];
};

export type Workspace = {
	id: string;
	odsVersion: `${number}.${number}.${number}`;
	name: string;
	homepage?: string;
	logoUrl?: string;
	primaryColor?: string;
	description: string;
	version: string;
	domains: Record<string, Domain>;
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

export function workspace(workspace: Omit<Workspace, "domains">): Workspace {
	return {
		...workspace,
		domains: {},
	};
}

export function domain(
	workspace: Workspace,
	domain: Omit<Domain, "subdomains">,
): Domain {
	const _domain = {
		...domain,
		subdomains: {},
	};
	workspace.domains[_domain.id] = _domain;
	return _domain;
}

export function subdomain(
	domain: Domain,
	subdomain: Omit<Subdomain, "boundedcontexts">,
): Subdomain {
	const _subdomain = {
		...subdomain,
		boundedcontexts: {},
	};
	domain.subdomains[_subdomain.id] = _subdomain;
	return _subdomain;
}

export function boundedcontext(
	subdomain: Subdomain,
	boundedcontext: Omit<BoundedContext, "aggregates" | "services">,
): BoundedContext {
	const _boundedcontext = {
		...boundedcontext,
		aggregates: {},
		services: {},
	};
	subdomain.boundedcontexts[_boundedcontext.id] = _boundedcontext;
	return _boundedcontext;
}

export function service(
	boundedcontext: BoundedContext,
	service: Omit<Service, "consumes" | "provides">,
): Service {
	const _service = {
		...service,
		provides: {},
		consumes: [],
	};
	boundedcontext.services[_service.id] = _service;
	return _service;
}

export function aggregate(
	boundedcontext: BoundedContext,
	aggregate: Omit<
		Aggregate,
		"provides" | "consumes" | "invariants" | "entities" | "valueobjects"
	>,
): Aggregate {
	const _aggregate = {
		...aggregate,
		provides: {},
		consumes: [],
		invariants: {},
		entities: {},
		valueobjects: {},
	};
	boundedcontext.aggregates[_aggregate.id] = _aggregate;
	return _aggregate;
}

export function invariant(
	aggregate: Aggregate,
	invariant: Invariant,
): Invariant {
	aggregate.invariants[invariant.id] = invariant;
	return invariant;
}

export function entity(
	aggregate: Aggregate,
	entity: Omit<Entity, "relations">,
): Entity {
	const _entity = {
		...entity,
		relations: [],
	};
	aggregate.entities[_entity.id] = _entity;
	return _entity;
}

export function valueobject(
	aggregate: Aggregate,
	valueobject: Omit<ValueObject, "relations">,
): ValueObject {
	const _valueobject = {
		...valueobject,
		relations: [],
	};
	aggregate.valueobjects[_valueobject.id] = _valueobject;
	return _valueobject;
}

export function consumable<T extends { provides: Record<string, Consumable> }>(
	provider: T,
	consumable: Consumable,
): Consumable {
	provider.provides[consumable.id] = consumable;
	return consumable;
}
