import type { Debugger } from "debug";
import { getDebug } from "./debug";
import type * as ods from "./schema";
import {
	type DownstreamRole,
	type EntityRelationType,
	RelationType,
	type UpstreamRole,
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
	boundedcontexts = new Map<string, BoundedContext>();
	relationships: ContextRelationship[] = [];
	teams = new Map<string, Team>();

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

	addBoundedContext(
		name: string,
		attributes: BoundedContextAttributes,
	): BoundedContext {
		return new BoundedContext(this, name, attributes);
	}

	addRelationship(
		attributes: ContextRelationshipAttributes,
	): ContextRelationship {
		return new ContextRelationship(this, attributes);
	}

	addTeam(name: string, attributes: TeamAttributes = {}): Team {
		return new Team(this, name, attributes);
	}

	getTeamByRef(ref: string): Team | undefined {
		for (const team of this.teams.values()) {
			if (team.ref === ref) return team;
		}
	}

	getTeamByRefOrThrow(ref: string): Team {
		const team = this.getTeamByRef(ref);
		if (!team) {
			throw new Error(`Team with ref ${ref} not found`);
		}
		return team;
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
		for (const boundedContext of this.boundedcontexts.values()) {
			if (boundedContext.ref === ref) {
				return boundedContext;
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

	private *services(): Iterable<Service> {
		for (const boundedContext of this.boundedcontexts.values()) {
			yield* boundedContext.services.values();
		}
	}

	private *aggregates(): Iterable<Aggregate> {
		for (const boundedContext of this.boundedcontexts.values()) {
			yield* boundedContext.aggregates.values();
		}
	}

	getServiceByRef(ref: string): Service | undefined {
		this.debug(`Searching for service with ref: ${ref}`);
		for (const service of this.services()) {
			if (service.ref === ref) {
				return service;
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
		for (const aggregate of this.aggregates()) {
			if (aggregate.ref === ref) {
				return aggregate;
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

	/** Finds a member of any aggregate by ref, given how to pick the member map. */
	private findAggregateMember<T extends { ref: string }>(
		members: (aggregate: Aggregate) => Map<string, T>,
		ref: string,
	): T | undefined {
		this.debug(`Searching aggregates for ref: ${ref}`);
		for (const aggregate of this.aggregates()) {
			for (const member of members(aggregate).values()) {
				if (member.ref === ref) return member;
			}
		}
	}

	getEntityByRef(ref: string): Entity | undefined {
		return this.findAggregateMember((it) => it.entities, ref);
	}

	getEntityByRefOrThrow(ref: string): Entity {
		const entity = this.getEntityByRef(ref);
		if (!entity) {
			throw new Error(`Entity with ref ${ref} not found`);
		}
		return entity;
	}

	getValueObjectByRef(ref: string): ValueObject | undefined {
		return this.findAggregateMember((it) => it.valueobjects, ref);
	}

	getValueObjectByRefOrThrow(ref: string): ValueObject {
		const valueObject = this.getValueObjectByRef(ref);
		if (!valueObject) {
			throw new Error(`Value Object with ref ${ref} not found`);
		}
		return valueObject;
	}

	getInvariantByRef(ref: string): Invariant | undefined {
		return this.findAggregateMember((it) => it.invariants, ref);
	}

	getInvariantByRefOrThrow(ref: string): Invariant {
		const invariant = this.getInvariantByRef(ref);
		if (!invariant) {
			throw new Error(`Invariant with ref ${ref} not found`);
		}
		return invariant;
	}

	/**
	 * Resolves an attribute ref (`<owner ref>/attributes/<id>`) by first
	 * resolving its owner, which may be an entity, value object, event or command.
	 */
	getAttributeByRef(ref: string): Attribute | undefined {
		const [ownerRef, attributeId] = ref.split("/attributes/");
		if (!attributeId) return undefined;
		const owner =
			this.getEntityOrValueobjectByRef(ownerRef) ??
			this.getEventByRef(ownerRef) ??
			this.getCommandByRef(ownerRef);
		return owner?.attributes.get(attributeId);
	}

	getAttributeByRefOrThrow(ref: string): Attribute {
		const attribute = this.getAttributeByRef(ref);
		if (!attribute) {
			throw new Error(`Attribute with ref ${ref} not found`);
		}
		return attribute;
	}

	/** Resolves any ref an invariant may constrain. */
	getConstrainableByRef(ref: string): Constrainable | undefined {
		return ref.includes("/attributes/")
			? this.getAttributeByRef(ref)
			: this.getEntityOrValueobjectByRef(ref);
	}

	getConstrainableByRefOrThrow(ref: string): Constrainable {
		const target = this.getConstrainableByRef(ref);
		if (!target) {
			throw new Error(
				`Entity, Value Object or Attribute with ref ${ref} not found`,
			);
		}
		return target;
	}

	private *policies(): Iterable<Policy> {
		for (const boundedContext of this.boundedcontexts.values()) {
			yield* boundedContext.policies.values();
		}
	}

	getPolicyByRef(ref: string): Policy | undefined {
		this.debug(`Searching for policy with ref: ${ref}`);
		for (const policy of this.policies()) {
			if (policy.ref === ref) {
				return policy;
			}
		}
	}

	getPolicyByRefOrThrow(ref: string): Policy {
		const policy = this.getPolicyByRef(ref);
		if (!policy) {
			throw new Error(`Policy with ref ${ref} not found`);
		}
		return policy;
	}

	getCommandByRef(ref: string): Command | undefined {
		return this.findAggregateMember((it) => it.commands, ref);
	}

	getCommandByRefOrThrow(ref: string): Command {
		const command = this.getCommandByRef(ref);
		if (!command) {
			throw new Error(`Command with ref ${ref} not found`);
		}
		return command;
	}

	getEventByRef(ref: string): DomainEvent | undefined {
		return this.findAggregateMember((it) => it.events, ref);
	}

	getEventByRefOrThrow(ref: string): DomainEvent {
		const event = this.getEventByRef(ref);
		if (!event) {
			throw new Error(`Event with ref ${ref} not found`);
		}
		return event;
	}

	getConsumableByRef(ref: string): Consumable | undefined {
		this.debug(`Searching for consumable with ref: ${ref}`);
		for (const provider of [...this.aggregates(), ...this.services()]) {
			for (const consumable of provider.consumables.values()) {
				if (consumable.ref === ref) {
					return consumable;
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
			boundedcontexts: asRecords(this.boundedcontexts),
			relationships: asArray(this.relationships),
			teams: asRecords(this.teams),
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
	id?: string;
};

export class Domain implements Visitable, SchemaConvertible<ods.DomainSchema> {
	id: string;
	name: string;
	description: string;
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
			subdomains: asRecords(this.subdomains),
		};
	}
}

export type SubdomainAttributes = {
	description: string;
	type: ods.SubdomainType;
	id?: string;
};

export class Subdomain
	implements Visitable, SchemaConvertible<ods.SubdomainSchema>
{
	id: string;
	name: string;
	description: string;
	type: ods.SubdomainType;
	domain: Domain;

	/** The bounded contexts serving this subdomain, derived from the workspace. */
	get boundedcontexts(): ReadonlyMap<string, BoundedContext> {
		const serving = new Map<string, BoundedContext>();
		for (const bc of this.domain.workspace.boundedcontexts.values()) {
			if (bc.subdomains.has(this)) serving.set(bc.id, bc);
		}
		return serving;
	}

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
		this.type = attributes.type;
		this.domain = domain;
		this.domain.subdomains.set(this.id, this);
	}

	/** Creates a context on the workspace that serves this subdomain. */
	addBoundedcontext(
		name: string,
		attributes: Omit<BoundedContextAttributes, "subdomains">,
	): BoundedContext {
		return this.domain.workspace.addBoundedContext(name, {
			...attributes,
			subdomains: [this],
		});
	}

	accept(v: Visitor) {
		return v.visitSubdomain(this);
	}

	toSchema(): ods.SubdomainSchema {
		return {
			name: this.name,
			type: this.type,
			description: this.description,
		};
	}
}

export type BoundedContextAttributes = {
	description: string;
	/** The subdomains this context serves. */
	subdomains?: Subdomain[];
	/** See {@link ods.BoundedContextSchema.bigBallOfMud}. */
	bigBallOfMud?: boolean;
	/** The team that owns this context. */
	team?: Team;
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
	policies = new Map<string, Policy>();
	workspace: Workspace;
	subdomains = new Set<Subdomain>();
	bigBallOfMud: boolean;
	team?: Team;

	get path(): string {
		return `boundedcontexts/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	/**
	 * The subdomain used when this context has to be shown in exactly one
	 * place, such as a context-map cluster or a breadcrumb trail. It is the
	 * first subdomain the context was linked to, or undefined when the
	 * context serves no subdomain.
	 */
	get primarySubdomain(): Subdomain | undefined {
		return this.subdomains.values().next().value;
	}

	constructor(
		workspace: Workspace,
		name: string,
		attributes: BoundedContextAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.workspace = workspace;
		this.bigBallOfMud = attributes.bigBallOfMud ?? false;
		this.team = attributes.team;
		this.workspace.boundedcontexts.set(this.id, this);
		for (const subdomain of attributes.subdomains ?? []) {
			this.serves(subdomain);
		}
	}

	/** Links this context to a subdomain it serves. */
	serves(subdomain: Subdomain): this {
		this.subdomains.add(subdomain);
		return this;
	}

	ownedBy(team: Team): this {
		this.team = team;
		return this;
	}

	/** Declares this context upstream of another. */
	upstreamOf(
		downstream: BoundedContext,
		options: DirectedRelationshipOptions = {},
	): ContextRelationship {
		return this.workspace.addRelationship({
			type: options.type ?? "upstream-downstream",
			upstream: this,
			downstream,
			upstreamRoles: options.upstreamRoles ?? [],
			downstreamRoles: options.downstreamRoles ?? [],
			description: options.description,
		});
	}

	/** Declares this context downstream of another. */
	downstreamOf(
		upstream: BoundedContext,
		options: DirectedRelationshipOptions = {},
	): ContextRelationship {
		return upstream.upstreamOf(this, options);
	}

	partnerOf(other: BoundedContext, description?: string): ContextRelationship {
		return this.symmetricWith("partnership", other, description);
	}

	sharesKernelWith(
		other: BoundedContext,
		description?: string,
	): ContextRelationship {
		return this.symmetricWith("shared-kernel", other, description);
	}

	separateWaysFrom(
		other: BoundedContext,
		description?: string,
	): ContextRelationship {
		return this.symmetricWith("separate-ways", other, description);
	}

	private symmetricWith(
		type: ods.SymmetricRelationshipType,
		other: BoundedContext,
		description?: string,
	): ContextRelationship {
		return this.workspace.addRelationship({
			type,
			participants: [this, other],
			description,
		});
	}

	addService(name: string, attributes: ServiceAttributes): Service {
		return new Service(this, name, attributes);
	}

	addAggregate(name: string, attributes: AggregateAttributes): Aggregate {
		return new Aggregate(this, name, attributes);
	}

	addPolicy(name: string, attributes: PolicyAttributes): Policy {
		return new Policy(this, name, attributes);
	}

	accept(v: Visitor) {
		return v.visitBoundedContext(this);
	}

	toSchema(): ods.BoundedContextSchema {
		return {
			name: this.name,
			description: this.description,
			subdomains: Array.from(this.subdomains, (it) => ({ $ref: it.ref })),
			bigBallOfMud: this.bigBallOfMud || undefined,
			team: this.team && { $ref: this.team.ref },
			aggregates: asRecords(this.aggregates),
			services: asRecords(this.services),
			policies: asRecords(this.policies),
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
	events = new Map<string, DomainEvent>();
	commands = new Map<string, Command>();
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

	addEvent(name: string, attributes: DomainEventAttributes): DomainEvent {
		return new DomainEvent(this, name, attributes);
	}

	addCommand(name: string, attributes: CommandAttributes): Command {
		return new Command(this, name, attributes);
	}

	/**
	 * Exposes a domain event to other contexts as an event consumable named
	 * after the event.
	 */
	publishes(
		event: DomainEvent,
		attributes: Omit<ConsumableAttributes, "type" | "event"> = {
			description: event.description,
		},
	): Consumable {
		return this.addConsumable(event.name, {
			...attributes,
			type: "event",
			event,
		});
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
			events: asRecords(this.events),
			commands: asRecords(this.commands),
		};
	}

	static isAggregateRef(ref: string): boolean {
		return ref.startsWith("#/") && ref.includes("/aggregates/");
	}
}

export type ConsumableAttributes = {
	description: string;
	pattern?: UpstreamRole;
	type: ods.ConsumableType;
	/** For event consumables: the domain event being published. */
	event?: DomainEvent;
	/** For operation consumables: the command being exposed. */
	command?: Command;
	id?: string;
};

export class Consumable
	implements Visitable, SchemaConvertible<ods.ConsumableSchema>
{
	id: string;
	name: string;
	description: string;
	pattern?: UpstreamRole;
	type: ods.ConsumableType;
	event?: DomainEvent;
	command?: Command;
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
		this.event = attributes.event;
		this.command = attributes.command;
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
			event: this.event && { $ref: this.event.ref },
			command: this.command && { $ref: this.command.ref },
		};
	}
}

export type EntityAttributes = {
	description: string;
	root?: boolean;
	id?: string;
};

export class Entity
	implements Visitable, SchemaConvertible<ods.EntitySchema>, AttributeOwner
{
	id: string;
	name: string;
	description: string;
	root: boolean;
	attributes = new Map<string, Attribute>();
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

	addAttribute(name: string, options: AttributeOptions): Attribute {
		return new Attribute(this, name, options);
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
			attributes: asRecords(this.attributes),
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
	implements Visitable, SchemaConvertible<ods.ValueObjectSchema>, AttributeOwner
{
	id: string;
	name: string;
	description: string;
	attributes = new Map<string, Attribute>();
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

	addAttribute(name: string, options: AttributeOptions): Attribute {
		return new Attribute(this, name, options);
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
			attributes: asRecords(this.attributes),
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
/** What an invariant can be declared over. */
export type Constrainable = Entity | ValueObject | Attribute;

/** "Owner.attribute" for an attribute, the element's name otherwise. */
export function constrainableLabel(target: Constrainable): string {
	return target instanceof Attribute
		? `${target.owner.name}.${target.name}`
		: target.name;
}

export class Invariant
	implements Visitable, SchemaConvertible<ods.InvariantSchema>
{
	id: string;
	name: string;
	description: string;
	aggregate: Aggregate;
	/** The elements this invariant constrains. */
	targets: Constrainable[] = [];

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

	/** Declares an element this invariant constrains. */
	constrains(...targets: Constrainable[]): this {
		for (const target of targets) {
			if (!this.targets.includes(target)) this.targets.push(target);
		}
		return this;
	}

	accept(v: Visitor) {
		return v.visitInvariant(this);
	}

	toSchema(): ods.InvariantSchema {
		return {
			name: this.name,
			description: this.description,
			constrains: this.targets.map((it) => ({ $ref: it.ref })),
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
	pattern?: DownstreamRole;
};

export class Consumption
	implements Visitable, SchemaConvertible<ods.ConsumptionSchema>
{
	consumer: Aggregate | Service;
	consumable: Consumable;
	pattern?: DownstreamRole;

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

export type DirectedRelationshipOptions = {
	type?: ods.DirectedRelationshipType;
	upstreamRoles?: UpstreamRole[];
	downstreamRoles?: DownstreamRole[];
	description?: string;
};

export type ContextRelationshipAttributes =
	| {
			type: ods.DirectedRelationshipType;
			upstream: BoundedContext;
			downstream: BoundedContext;
			upstreamRoles?: UpstreamRole[];
			downstreamRoles?: DownstreamRole[];
			description?: string;
	  }
	| {
			type: ods.SymmetricRelationshipType;
			participants: [BoundedContext, BoundedContext];
			description?: string;
	  };

const DIRECTED_RELATIONSHIP_TYPES: ReadonlySet<ods.ContextRelationshipType> =
	new Set<ods.ContextRelationshipType>([
		"upstream-downstream",
		"customer-supplier",
	]);

export function isDirectedRelationshipType(
	type: ods.ContextRelationshipType,
): type is ods.DirectedRelationshipType {
	return DIRECTED_RELATIONSHIP_TYPES.has(type);
}

/**
 * A strategic relationship between two bounded contexts. For directed types
 * `source` is the upstream context and `target` the downstream one; for
 * symmetric types the order carries no meaning.
 */
export class ContextRelationship
	implements Visitable, SchemaConvertible<ods.ContextRelationshipSchema>
{
	workspace: Workspace;
	type: ods.ContextRelationshipType;
	source: BoundedContext;
	target: BoundedContext;
	upstreamRoles: UpstreamRole[];
	downstreamRoles: DownstreamRole[];
	description?: string;

	constructor(workspace: Workspace, attributes: ContextRelationshipAttributes) {
		this.workspace = workspace;
		this.type = attributes.type;
		this.description = attributes.description;
		if ("participants" in attributes) {
			[this.source, this.target] = attributes.participants;
			this.upstreamRoles = [];
			this.downstreamRoles = [];
		} else {
			this.source = attributes.upstream;
			this.target = attributes.downstream;
			this.upstreamRoles = attributes.upstreamRoles ?? [];
			this.downstreamRoles = attributes.downstreamRoles ?? [];
		}
		workspace.relationships.push(this);
	}

	involves(bc: BoundedContext): boolean {
		return this.source === bc || this.target === bc;
	}

	accept(v: Visitor) {
		return v.visitContextRelationship(this);
	}

	toSchema(): ods.ContextRelationshipSchema {
		if (isDirectedRelationshipType(this.type)) {
			return {
				type: this.type,
				upstream: { $ref: this.source.ref },
				downstream: { $ref: this.target.ref },
				upstreamRoles: this.upstreamRoles,
				downstreamRoles: this.downstreamRoles,
				description: this.description,
			};
		}
		return {
			type: this.type,
			participants: [{ $ref: this.source.ref }, { $ref: this.target.ref }],
			description: this.description,
		};
	}
}

export type TeamAttributes = {
	description?: string;
	homepage?: string;
	id?: string;
};

export class Team implements SchemaConvertible<ods.TeamSchema> {
	id: string;
	name: string;
	description?: string;
	homepage?: string;
	workspace: Workspace;

	get path(): string {
		return `teams/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	/** The contexts this team owns, derived from the workspace. */
	get boundedcontexts(): BoundedContext[] {
		return Array.from(this.workspace.boundedcontexts.values()).filter(
			(bc) => bc.team === this,
		);
	}

	constructor(workspace: Workspace, name: string, attributes: TeamAttributes) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.homepage = attributes.homepage;
		this.workspace = workspace;
		this.workspace.teams.set(this.id, this);
	}

	toSchema(): ods.TeamSchema {
		return {
			name: this.name,
			description: this.description,
			homepage: this.homepage,
		};
	}
}

export type AttributeOptions = {
	type: string;
	description?: string;
	identity?: boolean;
	valueobject?: ValueObject;
	id?: string;
};

/** Anything that carries a list of attributes. */
export interface AttributeOwner {
	name: string;
	path: string;
	attributes: Map<string, Attribute>;
	addAttribute(name: string, options: AttributeOptions): Attribute;
}

export class Attribute implements SchemaConvertible<ods.AttributeSchema> {
	id: string;
	name: string;
	type: string;
	description?: string;
	identity: boolean;
	valueobject?: ValueObject;
	owner: AttributeOwner;

	get path(): string {
		return `${this.owner.path}/attributes/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		owner: AttributeOwner,
		name: string,
		attributes: AttributeOptions,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.type = attributes.type;
		this.description = attributes.description;
		this.identity = attributes.identity ?? false;
		this.valueobject = attributes.valueobject;
		this.owner = owner;
		this.owner.attributes.set(this.id, this);
	}

	toSchema(): ods.AttributeSchema {
		return {
			name: this.name,
			type: this.type,
			description: this.description,
			identity: this.identity || undefined,
			valueobject: this.valueobject && { $ref: this.valueobject.ref },
		};
	}
}

export type DomainEventAttributes = {
	description: string;
	id?: string;
};

export class DomainEvent
	implements Visitable, SchemaConvertible<ods.DomainEventSchema>, AttributeOwner
{
	id: string;
	name: string;
	description: string;
	attributes = new Map<string, Attribute>();
	aggregate: Aggregate;

	get path(): string {
		return `${this.aggregate.path}/events/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		aggregate: Aggregate,
		name: string,
		attributes: DomainEventAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.aggregate = aggregate;
		this.aggregate.events.set(this.id, this);
	}

	addAttribute(name: string, attributes: AttributeOptions): Attribute {
		return new Attribute(this, name, attributes);
	}

	accept(v: Visitor) {
		return v.visitDomainEvent(this);
	}

	toSchema(): ods.DomainEventSchema {
		return {
			name: this.name,
			description: this.description,
			attributes: asRecords(this.attributes),
		};
	}
}

export type CommandAttributes = {
	description: string;
	id?: string;
};

export class Command
	implements Visitable, SchemaConvertible<ods.CommandSchema>, AttributeOwner
{
	id: string;
	name: string;
	description: string;
	attributes = new Map<string, Attribute>();
	/** The events this command may raise. */
	raisedEvents: DomainEvent[] = [];
	aggregate: Aggregate;

	get path(): string {
		return `${this.aggregate.path}/commands/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		aggregate: Aggregate,
		name: string,
		attributes: CommandAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.aggregate = aggregate;
		this.aggregate.commands.set(this.id, this);
	}

	addAttribute(name: string, options: AttributeOptions): Attribute {
		return new Attribute(this, name, options);
	}

	/** Declares an event this command may raise. */
	raises(event: DomainEvent): this {
		if (!this.raisedEvents.includes(event)) this.raisedEvents.push(event);
		return this;
	}

	accept(v: Visitor) {
		return v.visitCommand(this);
	}

	toSchema(): ods.CommandSchema {
		return {
			name: this.name,
			description: this.description,
			attributes: asRecords(this.attributes),
			raises: this.raisedEvents.map((it) => ({ $ref: it.ref })),
		};
	}
}

export type PolicyAttributes = {
	description: string;
	id?: string;
};

/**
 * A reaction that lives in a bounded context: when any of its events happen,
 * it issues its commands. Events and commands may belong to other contexts.
 */
export class Policy implements Visitable, SchemaConvertible<ods.PolicySchema> {
	id: string;
	name: string;
	description: string;
	boundedcontext: BoundedContext;
	events: DomainEvent[] = [];
	commands: Command[] = [];

	get path(): string {
		return `${this.boundedcontext.path}/policies/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		boundedcontext: BoundedContext,
		name: string,
		attributes: PolicyAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.boundedcontext = boundedcontext;
		this.boundedcontext.policies.set(this.id, this);
	}

	/** Adds a triggering event. */
	on(...events: DomainEvent[]): this {
		for (const event of events) {
			if (!this.events.includes(event)) this.events.push(event);
		}
		return this;
	}

	/** Adds a command to issue. */
	then(...commands: Command[]): this {
		for (const command of commands) {
			if (!this.commands.includes(command)) this.commands.push(command);
		}
		return this;
	}

	accept(v: Visitor) {
		return v.visitPolicy(this);
	}

	toSchema(): ods.PolicySchema {
		return {
			name: this.name,
			description: this.description,
			on: this.events.map((it) => ({ $ref: it.ref })),
			then: this.commands.map((it) => ({ $ref: it.ref })),
		};
	}
}
