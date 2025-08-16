import type { Debugger } from "debug";
import { getDebug } from "./debug";
import type * as ods from "./schema";
import {
	type ConsumptionPattern,
	type EntityRelationType,
	RelationType,
} from "./schema";
import type { Visitable } from "./visitable";
import type { Visitor } from "./visitor";
import { getWorkspaceFromSchema } from "./workspace-from-schema";

function snakeCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, "$1_$2") // Insert underscore before uppercase letters
		.replace(/[\s-]+/g, "_") // Replace spaces and hyphens with underscores
		.toLowerCase(); // Convert to lowercase
}

interface SchemaConvertible<T> {
	toSchema(): T;
}

function asRecords<R, T extends SchemaConvertible<R>>(
	map: Map<string, T>,
): Record<string, R> {
	return Object.fromEntries(
		Array.from(map.entries()).map(([id, valueObject]) => [
			id,
			valueObject.toSchema(),
		]),
	);
}

function asArray<R, T extends SchemaConvertible<R>>(map: Array<T>): Array<R> {
	return map.map((valueObject) => valueObject.toSchema());
}

export type WorkspaceAttributes = {
	odsVersion: `${number}.${number}.${number}`;
	description: string;
	homepage?: string;
	logoUrl?: string;
	primaryColor?: string;
	version: string;
	id?: string;
};

export class Workspace
	implements Visitable, SchemaConvertible<ods.WorkspaceSchema>
{
	debug: Debugger;
	id: string;
	odsVersion: `${number}.${number}.${number}`;
	name: string;
	homepage?: string;
	logoUrl?: string;
	primaryColor?: string;
	description: string;
	version: string;
	domains = new Map<string, Domain>();

	get path(): string {
		return `${this.id}`;
	}

	constructor(name: string, attributes: WorkspaceAttributes) {
		this.debug = getDebug(`workspace:${name}`);
		this.id = attributes.id || snakeCase(name);
		this.odsVersion = attributes.odsVersion;
		this.name = name;
		this.homepage = attributes.homepage;
		this.logoUrl = attributes.logoUrl;
		this.primaryColor = attributes.primaryColor;
		this.description = attributes.description;
		this.version = attributes.version;
	}

	addDomain(name: string, attributes: DomainAttributes): Domain {
		return new Domain(this, name, attributes);
	}

	accept(v: Visitor) {
		return v.visitWorkspace(this);
	}

	getDomainByRef(ref: string): Domain | undefined {
		this.debug(`Searching for domain with ref: ${ref}`);
		for (const domain of this.domains.values()) {
			this.debug(`Checking domain: ${domain.name} with ref: ${domain.ref}`);
			if (domain.ref === ref) {
				return domain;
			}
		}
	}

	getDomainByRefOrThrow(ref: string): Domain {
		const domain = this.getDomainByRef(ref);
		if (!domain) {
			throw new Error(`Domain with ref ${ref} not found`);
		}
		return domain;
	}

	getSubdomainByRef(ref: string): Subdomain | undefined {
		this.debug(`Searching for subdomain with ref: ${ref}`);
		for (const domain of this.domains.values()) {
			this.debug(`Checking domain: ${domain.name}`);
			for (const subdomain of domain.subdomains.values()) {
				this.debug(
					`Checking subdomain: ${subdomain.name} with ref: ${subdomain.ref}`,
				);
				if (subdomain.ref === ref) {
					return subdomain;
				}
			}
		}
	}

	getSubdomainByRefOrThrow(ref: string): Subdomain {
		const subdomain = this.getSubdomainByRef(ref);
		if (!subdomain) {
			throw new Error(`Subdomain with ref ${ref} not found`);
		}
		return subdomain;
	}

	getBoundedContextByRef(ref: string): BoundedContext | undefined {
		this.debug(`Searching for bounded context with ref: ${ref}`);
		for (const domain of this.domains.values()) {
			this.debug(`Checking domain: ${domain.name}`);
			for (const subdomain of domain.subdomains.values()) {
				this.debug(`Checking subdomain: ${subdomain.name}`);
				for (const boundedContext of subdomain.boundedcontexts.values()) {
					this.debug(
						`Checking bounded context: ${boundedContext.name} with ref: ${boundedContext.ref}`,
					);
					if (boundedContext.ref === ref) {
						return boundedContext;
					}
				}
			}
		}
	}

	getBoundedContextByRefOrThrow(ref: string): BoundedContext {
		const boundedContext = this.getBoundedContextByRef(ref);
		if (!boundedContext) {
			throw new Error(`Bounded Context with ref ${ref} not found`);
		}
		return boundedContext;
	}

	getServiceOrAggregateByRef(ref: string): Aggregate | Service | undefined {
		switch (true) {
			case Aggregate.isAggregateRef(ref):
				return this.getAggregateByRef(ref);
			case Service.isServiceRef(ref):
				return this.getServiceByRef(ref);
			default:
				return undefined;
		}
	}

	getServiceOrAggregateByRefOrThrow(ref: string): Aggregate | Service {
		const serviceOrAggregate = this.getServiceOrAggregateByRef(ref);
		if (!serviceOrAggregate) {
			throw new Error(`Service or Aggregate with ref ${ref} not found`);
		}
		return serviceOrAggregate;
	}

	getServiceByRef(ref: string): Service | undefined {
		this.debug(`Searching for service with ref: ${ref}`);
		for (const domain of this.domains.values()) {
			this.debug(`Checking domain: ${domain.name}`);
			for (const subdomain of domain.subdomains.values()) {
				this.debug(`Checking subdomain: ${subdomain.name}`);
				for (const boundedContext of subdomain.boundedcontexts.values()) {
					this.debug(`Checking bounded context: ${boundedContext.name}`);
					for (const service of boundedContext.services.values()) {
						this.debug(
							`Checking service: ${service.name} with ref: ${service.ref}`,
						);
						if (service.ref === ref) {
							return service;
						}
					}
				}
			}
		}
	}

	getServiceByRefOrThrow(ref: string): Service {
		const service = this.getServiceByRef(ref);
		if (!service) {
			throw new Error(`Service with ref ${ref} not found`);
		}
		return service;
	}

	getAggregateByRef(ref: string): Aggregate | undefined {
		this.debug(`Searching for aggregate with ref: ${ref}`);
		for (const domain of this.domains.values()) {
			this.debug(`Checking domain: ${domain.name}`);
			for (const subdomain of domain.subdomains.values()) {
				this.debug(`Checking subdomain: ${subdomain.name}`);
				for (const boundedContext of subdomain.boundedcontexts.values()) {
					this.debug(`Checking bounded context: ${boundedContext.name}`);
					for (const aggregate of boundedContext.aggregates.values()) {
						this.debug(
							`Checking aggregate: ${aggregate.name} with ref: ${aggregate.ref}`,
						);
						if (aggregate.ref === ref) {
							return aggregate;
						}
					}
				}
			}
		}
	}

	getAggregateByRefOrThrow(ref: string): Aggregate {
		const aggregate = this.getAggregateByRef(ref);
		if (!aggregate) {
			throw new Error(`Aggregate with ref ${ref} not found`);
		}
		return aggregate;
	}

	getEntityOrValueobjectByRef(ref: string): Entity | ValueObject | undefined {
		switch (true) {
			case Entity.isEntityRef(ref):
				return this.getEntityByRef(ref);
			case ValueObject.isValueObjectRef(ref):
				return this.getValueObjectByRef(ref);
			default:
				return undefined;
		}
	}

	getEntityOrValueobjectByRefOrThrow(ref: string): Entity | ValueObject {
		const entityOrValueObject = this.getEntityOrValueobjectByRef(ref);
		if (!entityOrValueObject) {
			throw new Error(`Entity or Value Object with ref ${ref} not found`);
		}
		return entityOrValueObject;
	}

	getEntityByRef(ref: string): Entity | undefined {
		this.debug(`Searching for entity with ref: ${ref}`);
		for (const domain of this.domains.values()) {
			this.debug(`Checking domain: ${domain.name}`);
			for (const subdomain of domain.subdomains.values()) {
				this.debug(`Checking subdomain: ${subdomain.name}`);
				for (const boundedContext of subdomain.boundedcontexts.values()) {
					this.debug(`Checking bounded context: ${boundedContext.name}`);
					for (const aggregate of boundedContext.aggregates.values()) {
						this.debug(`Checking aggregate: ${aggregate.name}`);
						for (const entity of aggregate.entities.values()) {
							this.debug(
								`Checking entity: ${entity.name} with ref: ${entity.ref}`,
							);
							if (entity.ref === ref) {
								return entity;
							}
						}
					}
				}
			}
		}
	}

	getEntityByRefOrThrow(ref: string): Entity {
		const entity = this.getEntityByRef(ref);
		if (!entity) {
			throw new Error(`Entity with ref ${ref} not found`);
		}
		return entity;
	}

	getValueObjectByRef(ref: string): ValueObject | undefined {
		this.debug(`Searching for value object with ref: ${ref}`);
		for (const domain of this.domains.values()) {
			this.debug(`Checking domain: ${domain.name}`);
			for (const subdomain of domain.subdomains.values()) {
				this.debug(`Checking subdomain: ${subdomain.name}`);
				for (const boundedContext of subdomain.boundedcontexts.values()) {
					this.debug(`Checking bounded context: ${boundedContext.name}`);
					for (const aggregate of boundedContext.aggregates.values()) {
						this.debug(`Checking aggregate: ${aggregate.name}`);
						for (const valueObject of aggregate.valueobjects.values()) {
							this.debug(
								`Checking value object: ${valueObject.name} with ref: ${valueObject.ref}`,
							);
							if (valueObject.ref === ref) {
								return valueObject;
							}
						}
					}
				}
			}
		}
	}

	getValueObjectByRefOrThrow(ref: string): ValueObject {
		const valueObject = this.getValueObjectByRef(ref);
		if (!valueObject) {
			throw new Error(`Value Object with ref ${ref} not found`);
		}
		return valueObject;
	}

	getInvariantByRef(ref: string): Invariant | undefined {
		this.debug(`Searching for invariant with ref: ${ref}`);
		for (const domain of this.domains.values()) {
			this.debug(`Checking domain: ${domain.name}`);
			for (const subdomain of domain.subdomains.values()) {
				this.debug(`Checking subdomain: ${subdomain.name}`);
				for (const boundedContext of subdomain.boundedcontexts.values()) {
					this.debug(`Checking bounded context: ${boundedContext.name}`);
					for (const aggregate of boundedContext.aggregates.values()) {
						this.debug(`Checking aggregate: ${aggregate.name}`);
						for (const invariant of aggregate.invariants.values()) {
							this.debug(
								`Checking invariant: ${invariant.name} with ref: ${invariant.ref}`,
							);
							if (invariant.ref === ref) {
								return invariant;
							}
						}
					}
				}
			}
		}
	}

	getInvariantByRefOrThrow(ref: string): Invariant {
		const invariant = this.getInvariantByRef(ref);
		if (!invariant) {
			throw new Error(`Invariant with ref ${ref} not found`);
		}
		return invariant;
	}

	getConsumableByRef(ref: string): Consumable | undefined {
		this.debug(`Searching for consumable with ref: ${ref}`);
		for (const domain of this.domains.values()) {
			this.debug(`Checking domain: ${domain.name}`);
			for (const subdomain of domain.subdomains.values()) {
				this.debug(`Checking subdomain: ${subdomain.name}`);
				for (const boundedContext of subdomain.boundedcontexts.values()) {
					this.debug(`Checking bounded context: ${boundedContext.name}`);
					for (const aggregate of boundedContext.aggregates.values()) {
						this.debug(`Checking aggregate: ${aggregate.name}`);
						for (const consumable of aggregate.consumables.values()) {
							this.debug(
								`Checking consumable: ${consumable.name} with ref: ${consumable.ref}`,
							);
							if (consumable.ref === ref) {
								return consumable;
							}
						}
					}
					for (const service of boundedContext.services.values()) {
						this.debug(`Checking service: ${service.name}`);
						for (const consumable of service.consumables.values()) {
							this.debug(
								`Checking consumable: ${consumable.name} with ref: ${consumable.ref}`,
							);
							if (consumable.ref === ref) {
								return consumable;
							}
						}
					}
				}
			}
		}
	}

	getConsumableByRefOrThrow(ref: string): Consumable {
		const consumable = this.getConsumableByRef(ref);
		if (!consumable) {
			throw new Error(`Consumable with ref ${ref} not found`);
		}
		return consumable;
	}

	toSchema(): ods.WorkspaceSchema {
		return {
			id: this.id,
			name: this.name,
			description: this.description,
			version: this.version,
			odsVersion: this.odsVersion,
			primaryColor: this.primaryColor,
			domains: asRecords(this.domains),
			homepage: this.homepage,
			logoUrl: this.logoUrl,
		};
	}

	static fromSchema(workspace: ods.WorkspaceSchema): Workspace {
		return getWorkspaceFromSchema(workspace);
	}
}

export type DomainAttributes = {
	description: string;
	type: ods.DomainType;
	id?: string;
};

export class Domain implements Visitable, SchemaConvertible<ods.DomainSchema> {
	id: string;
	name: string;
	description: string;
	type: ods.DomainType;
	subdomains = new Map<string, Subdomain>();
	workspace: Workspace;

	get path(): string {
		return `domains/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		workspace: Workspace,
		name: string,
		attributes: DomainAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.type = attributes.type;
		this.workspace = workspace;
		this.workspace.domains.set(this.id, this);
	}

	addSubdomain(name: string, attributes: SubdomainAttributes): Subdomain {
		return new Subdomain(this, name, attributes);
	}

	accept(v: Visitor) {
		return v.visitDomain(this);
	}

	toSchema(): ods.DomainSchema {
		return {
			name: this.name,
			description: this.description,
			type: this.type,
			subdomains: asRecords(this.subdomains),
		};
	}
}

export type SubdomainAttributes = {
	description: string;
	id?: string;
};

export class Subdomain
	implements Visitable, SchemaConvertible<ods.SubdomainSchema>
{
	id: string;
	name: string;
	description: string;
	boundedcontexts = new Map<string, BoundedContext>();
	domain: Domain;

	get path(): string {
		return `${this.domain.path}/subdomains/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(domain: Domain, name: string, attributes: SubdomainAttributes) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.domain = domain;
		this.domain.subdomains.set(this.id, this);
	}

	addBoundedcontext(
		name: string,
		attributes: BoundedContextAttributes,
	): BoundedContext {
		return new BoundedContext(this, name, attributes);
	}

	accept(v: Visitor) {
		return v.visitSubdomain(this);
	}

	toSchema(): ods.SubdomainSchema {
		return {
			name: this.name,
			description: this.description,
			boundedcontexts: asRecords(this.boundedcontexts),
		};
	}
}

export type BoundedContextAttributes = {
	description: string;
	id?: string;
};

export class BoundedContext
	implements Visitable, SchemaConvertible<ods.BoundedContextSchema>
{
	id: string;
	name: string;
	description: string;
	services = new Map<string, Service>();
	aggregates = new Map<string, Aggregate>();
	subdomain: Subdomain;

	get path(): string {
		return `${this.subdomain.path}/boundedcontexts/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		subdomain: Subdomain,
		name: string,
		attributes: BoundedContextAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.subdomain = subdomain;
		this.subdomain.boundedcontexts.set(this.id, this);
	}

	addService(name: string, attributes: ServiceAttributes): Service {
		return new Service(this, name, attributes);
	}

	addAggregate(name: string, attributes: AggregateAttributes): Aggregate {
		return new Aggregate(this, name, attributes);
	}

	accept(v: Visitor) {
		return v.visitBoundedContext(this);
	}

	toSchema(): ods.BoundedContextSchema {
		return {
			name: this.name,
			description: this.description,
			aggregates: asRecords(this.aggregates),
			services: asRecords(this.services),
		};
	}
}

export type ServiceAttributes = {
	description: string;
	type: ods.ServiceType;
	id?: string;
};

export class Service
	implements Visitable, SchemaConvertible<ods.ServiceSchema>
{
	id: string;
	name: string;
	description: string;
	type: ods.ServiceType;
	consumables = new Map<string, Consumable>();
	boundedcontext: BoundedContext;
	consumptions: Consumption[] = [];

	get path(): string {
		return `${this.boundedcontext.path}/services/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		boundedcontext: BoundedContext,
		name: string,
		attributes: ServiceAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.type = attributes.type;
		this.boundedcontext = boundedcontext;
		this.boundedcontext.services.set(this.id, this);
	}

	addConsumable(name: string, attributes: ConsumableAttributes): Consumable {
		return new Consumable(this, name, attributes);
	}

	addConsumption(
		consumable: Consumable,
		attributes: ConsumptionAttributes,
	): Consumption {
		return new Consumption(this, consumable, attributes);
	}

	provides(name: string, attributes: ConsumableAttributes): Consumable {
		return this.addConsumable(name, attributes);
	}

	consumes(
		consumable: Consumable,
		attributes: ConsumptionAttributes,
	): Consumption {
		return this.addConsumption(consumable, attributes);
	}

	accept(v: Visitor) {
		return v.visitService(this);
	}

	toSchema(): ods.ServiceSchema {
		return {
			name: this.name,
			description: this.description,
			type: this.type,
			provides: asRecords(this.consumables),
			consumes: asArray(this.consumptions),
		};
	}

	static isServiceRef(ref: string): boolean {
		return ref.startsWith("#/") && ref.includes("/services/");
	}
}

export type AggregateAttributes = {
	description: string;
	id?: string;
};

export class Aggregate
	implements Visitable, SchemaConvertible<ods.AggregateSchema>
{
	id: string;
	name: string;
	description: string;
	consumables = new Map<string, Consumable>();
	invariants = new Map<string, Invariant>();
	entities = new Map<string, Entity>();
	valueobjects = new Map<string, ValueObject>();
	boundedcontext: BoundedContext;
	consumptions: Consumption[] = [];

	get path(): string {
		return `${this.boundedcontext.path}/aggregates/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		boundedcontext: BoundedContext,
		name: string,
		attributes: AggregateAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.boundedcontext = boundedcontext;
		this.boundedcontext.aggregates.set(this.id, this);
	}

	addConsumable(name: string, attributes: ConsumableAttributes): Consumable {
		return new Consumable(this, name, attributes);
	}

	addConsumption(
		consumable: Consumable,
		attributes: ConsumptionAttributes,
	): Consumption {
		return new Consumption(this, consumable, attributes);
	}

	provides(name: string, attributes: ConsumableAttributes): Consumable {
		return this.addConsumable(name, attributes);
	}

	consumes(
		consumable: Consumable,
		attributes: ConsumptionAttributes,
	): Consumption {
		return this.addConsumption(consumable, attributes);
	}
	addInvariant(name: string, attributes: InvariantAttributes): Invariant {
		return new Invariant(this, name, attributes);
	}

	addEntity(name: string, attributes: EntityAttributes): Entity {
		return new Entity(this, name, attributes);
	}

	addRootEntity(
		name: string,
		attributes: Omit<EntityAttributes, "root">,
	): Entity {
		return new Entity(this, name, { ...attributes, root: true });
	}

	addValueObject(name: string, attributes: ValueObjectAttributes): ValueObject {
		return new ValueObject(this, name, attributes);
	}

	accept(v: Visitor) {
		return v.visitAggregate(this);
	}

	toSchema(): ods.AggregateSchema {
		return {
			name: this.name,
			description: this.description,
			provides: asRecords(this.consumables),
			consumes: asArray(this.consumptions),
			entities: asRecords(this.entities),
			valueobjects: asRecords(this.valueobjects),
			invariants: asRecords(this.invariants),
		};
	}

	static isAggregateRef(ref: string): boolean {
		return ref.startsWith("#/") && ref.includes("/aggregates/");
	}
}

export type ConsumableAttributes = {
	description: string;
	pattern: ods.ConsumablePattern;
	type: ods.ConsumableType;
	id?: string;
};

export class Consumable
	implements Visitable, SchemaConvertible<ods.ConsumableSchema>
{
	id: string;
	name: string;
	description: string;
	pattern: ods.ConsumablePattern;
	type: ods.ConsumableType;
	provider: Aggregate | Service;
	consumptions: Consumption[] = [];

	get path(): string {
		return `${this.provider.path}/provides/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		provider: Aggregate | Service,
		name: string,
		attributes: ConsumableAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.pattern = attributes.pattern;
		this.type = attributes.type;
		this.provider = provider;
		provider.consumables.set(this.id, this);
	}

	accept(v: Visitor) {
		return v.visitConsumable(this);
	}

	toSchema(): ods.ConsumableSchema {
		return {
			name: this.name,
			description: this.description,
			pattern: this.pattern,
			type: this.type,
		};
	}
}

export type EntityAttributes = {
	description: string;
	root?: boolean;
	id?: string;
};

export class Entity implements Visitable, SchemaConvertible<ods.EntitySchema> {
	id: string;
	name: string;
	description: string;
	root: boolean;
	relations = [] as EntityRelation[];
	aggregate: Aggregate;

	get path(): string {
		return `${this.aggregate.path}/entities/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		aggregate: Aggregate,
		name: string,
		attributes: EntityAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.root = attributes.root || false;
		this.aggregate = aggregate;
		this.aggregate.entities.set(this.id, this);
	}

	addRelation(
		target: Entity | ValueObject,
		attributes: EntityRelationAttributes,
	): EntityRelation {
		return new EntityRelation(this, target, attributes);
	}

	relatesTo(
		target: Entity | ValueObject,
		attributes: EntityRelationAttributes,
	): EntityRelation {
		return this.addRelation(target, attributes);
	}

	uses(target: Entity | ValueObject, label: string) {
		this.addRelation(target, {
			label,
			relation: RelationType.Uses,
		});
	}

	includes(target: Entity | ValueObject, label: string) {
		this.addRelation(target, {
			label,
			relation: RelationType.Includes,
		});
	}

	references(target: Entity | ValueObject, label: string) {
		this.addRelation(target, {
			label,
			relation: RelationType.References,
		});
	}

	accept(v: Visitor) {
		return v.visitEntity(this);
	}

	toSchema(): ods.EntitySchema {
		return {
			name: this.name,
			description: this.description,
			root: this.root,
			relations: asArray(this.relations),
		};
	}

	static isEntityRef(ref: string): boolean {
		return ref.startsWith("#/") && ref.includes("/entities/");
	}
}

export type ValueObjectAttributes = {
	description: string;
	id?: string;
};

export class ValueObject
	implements Visitable, SchemaConvertible<ods.ValueObjectSchema>
{
	id: string;
	name: string;
	description: string;
	relations = [] as EntityRelation[];
	aggregate: Aggregate;

	get path(): string {
		return `${this.aggregate.path}/valueobjects/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		aggregate: Aggregate,
		name: string,
		attributes: ValueObjectAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.aggregate = aggregate;
		this.aggregate.valueobjects.set(this.id, this);
	}

	addRelation(
		target: Entity | ValueObject,
		attributes: EntityRelationAttributes,
	): EntityRelation {
		return new EntityRelation(this, target, attributes);
	}

	relatesTo(
		target: Entity | ValueObject,
		attributes: EntityRelationAttributes,
	): EntityRelation {
		return this.addRelation(target, attributes);
	}

	uses(target: Entity | ValueObject, label: string) {
		this.addRelation(target, {
			label,
			relation: RelationType.Uses,
		});
	}

	includes(target: Entity | ValueObject, label: string) {
		this.addRelation(target, {
			label,
			relation: RelationType.Includes,
		});
	}

	references(target: Entity | ValueObject, label: string) {
		this.addRelation(target, {
			label,
			relation: RelationType.References,
		});
	}

	accept(v: Visitor) {
		return v.visitValueObject(this);
	}

	toSchema(): ods.ValueObjectSchema {
		return {
			name: this.name,
			description: this.description,
			relations: asArray(this.relations),
		};
	}

	static isValueObjectRef(ref: string): boolean {
		return ref.startsWith("#/") && ref.includes("/valueobjects/");
	}
}

export type InvariantAttributes = {
	description: string;
	id?: string;
};
export class Invariant
	implements Visitable, SchemaConvertible<ods.InvariantSchema>
{
	id: string;
	name: string;
	description: string;
	aggregate: Aggregate;

	get path(): string {
		return `${this.aggregate.path}/invariants/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		aggregate: Aggregate,
		name: string,
		attributes: InvariantAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.aggregate = aggregate;
		this.aggregate.invariants.set(this.id, this);
	}

	accept(v: Visitor) {
		return v.visitInvariant(this);
	}

	toSchema(): ods.InvariantSchema {
		return {
			name: this.name,
			description: this.description,
		};
	}
}

export type EntityRelationAttributes = {
	label?: string;
	relation: EntityRelationType;
};

export class EntityRelation
	implements Visitable, SchemaConvertible<ods.EntityRelationSchema>
{
	source: Entity | ValueObject;
	target: Entity | ValueObject;
	label?: string;
	relation: EntityRelationType;

	constructor(
		source: Entity | ValueObject,
		target: Entity | ValueObject,
		attributes: EntityRelationAttributes,
	) {
		this.source = source;
		this.target = target;
		this.label = attributes.label;
		this.relation = attributes.relation;
		source.relations.push(this);
	}

	accept(v: Visitor) {
		return v.visitEntityRelation(this);
	}

	toSchema(): ods.EntityRelationSchema {
		return {
			target: { $ref: this.target.ref },
			relation: this.relation,
			label: this.label,
		};
	}
}

export type ConsumptionAttributes = {
	pattern: ConsumptionPattern;
};

export class Consumption
	implements Visitable, SchemaConvertible<ods.ConsumptionSchema>
{
	consumer: Aggregate | Service;
	consumable: Consumable;
	pattern: ConsumptionPattern;

	constructor(
		consumer: Aggregate | Service,
		consumable: Consumable,
		attributes: ConsumptionAttributes,
	) {
		this.consumer = consumer;
		this.consumer.consumptions.push(this);
		this.consumable = consumable;
		this.pattern = attributes.pattern;
		this.consumable.consumptions.push(this);
	}

	accept(v: Visitor) {
		return v.visitConsumption(this);
	}

	toSchema(): ods.ConsumptionSchema {
		return {
			consumable: { $ref: this.consumable.ref },
			pattern: this.pattern,
		};
	}
}
