import type { Debugger } from "debug";
import { getDebug } from "./debug";
import {
	type Evidenced,
	type EvidenceOptions,
	normaliseDisposition,
} from "./evidence";
import type * as ods from "./schema";
import {
	type DownstreamRole,
	type EntityRelationType,
	type RelationCardinality,
	RelationType,
	type UpstreamRole,
} from "./schema";
import { type Diagnostic, validateWorkspace } from "./validate";
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
	options?: ods.WorkspaceOptionsSchema;
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
	/** Switches for behaviour that is not part of the model, such as opt-in rules. */
	options?: ods.WorkspaceOptionsSchema;
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
		this.options = attributes.options;
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

	/** The relationship a {@link ContextRelationship.ref} points at, if any. */
	findRelationship(ref: string): ContextRelationship | undefined {
		return this.relationships.find((r) => r.ref === ref);
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
		const target = this.getByRef(ref);
		return target instanceof Aggregate || target instanceof Service
			? target
			: undefined;
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
		const target = this.getByRef(ref);
		return target instanceof Entity || target instanceof ValueObject
			? target
			: undefined;
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
		this.debug(`Searching for value object with ref: ${ref}`);
		for (const bc of this.boundedcontexts.values()) {
			for (const vo of bc.valueobjects.values()) {
				if (vo.ref === ref) return vo;
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

	/** An invariant of any aggregate, or of any context (decision 27). */
	getInvariantByRef(ref: string): Invariant | undefined {
		const inAggregate = this.findAggregateMember((it) => it.invariants, ref);
		if (inAggregate) return inAggregate;
		for (const bc of this.boundedcontexts.values()) {
			for (const invariant of bc.invariants.values()) {
				if (invariant.ref === ref) return invariant;
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

	/**
	 * Resolves an attribute ref (`<owner ref>/attributes/<id>`) by first
	 * resolving its owner, which may be an entity, value object or schema.
	 */
	getAttributeByRef(ref: string): Attribute | undefined {
		const [ownerRef, attributeId] = ref.split("/attributes/");
		if (!attributeId) return undefined;
		const owner =
			this.getEntityOrValueobjectByRef(ownerRef) ??
			this.getSchemaByRef(ownerRef);
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
		const target = this.getByRef(ref);
		return target instanceof Entity ||
			target instanceof ValueObject ||
			target instanceof Attribute ||
			target instanceof Consumable
			? target
			: undefined;
	}

	getConstrainableByRefOrThrow(ref: string): Constrainable {
		const target = this.getConstrainableByRef(ref);
		if (!target) {
			throw new Error(
				`Entity, Value Object, Attribute or Consumable with ref ${ref} not found`,
			);
		}
		return target;
	}

	/** Resolves any ref a consumption's `by` may name. */
	getConsumptionCallerByRef(ref: string): ConsumptionCaller | undefined {
		const target = this.getByRef(ref);
		return target instanceof Consumable || target instanceof Policy
			? target
			: undefined;
	}

	getConsumptionCallerByRefOrThrow(ref: string): ConsumptionCaller {
		const target = this.getConsumptionCallerByRef(ref);
		if (!target) {
			throw new Error(`Consumable or Policy with ref ${ref} not found`);
		}
		return target;
	}

	private *terms(): Iterable<GlossaryTerm> {
		for (const boundedContext of this.boundedcontexts.values()) {
			yield* boundedContext.glossary.values();
		}
	}

	getTermByRef(ref: string): GlossaryTerm | undefined {
		this.debug(`Searching for glossary term with ref: ${ref}`);
		for (const term of this.terms()) {
			if (term.ref === ref) {
				return term;
			}
		}
	}

	getTermByRefOrThrow(ref: string): GlossaryTerm {
		const term = this.getTermByRef(ref);
		if (!term) {
			throw new Error(`Glossary term with ref ${ref} not found`);
		}
		return term;
	}

	/**
	 * Resolves any ref in the workspace. The segment before the id names the
	 * collection, which is the single place ref shapes are interpreted; the
	 * polymorphic lookups above narrow this result by type.
	 */
	getByRef(ref: string): Referenceable | undefined {
		const segments = ref.split("/");
		const kind = segments[segments.length - 2];
		switch (kind) {
			case "domains":
				return this.getDomainByRef(ref);
			case "subdomains":
				return this.getSubdomainByRef(ref);
			case "boundedcontexts":
				return this.getBoundedContextByRef(ref);
			case "teams":
				return this.getTeamByRef(ref);
			case "services":
				return this.getServiceByRef(ref);
			case "aggregates":
				return this.getAggregateByRef(ref);
			case "entities":
				return this.getEntityByRef(ref);
			case "valueobjects":
				return this.getValueObjectByRef(ref);
			case "invariants":
				return this.getInvariantByRef(ref);
			case "schemas":
				return this.getSchemaByRef(ref);
			case "provides":
				return this.getConsumableByRef(ref);
			case "policies":
				return this.getPolicyByRef(ref);
			case "glossary":
				return this.getTermByRef(ref);
			case "attributes":
				return this.getAttributeByRef(ref);
			default:
				return undefined;
		}
	}

	getByRefOrThrow(ref: string): Referenceable {
		const target = this.getByRef(ref);
		if (!target) {
			throw new Error(`Nothing found with ref ${ref}`);
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

	getSchemaByRef(ref: string): DataSchema | undefined {
		this.debug(`Searching for schema with ref: ${ref}`);
		for (const boundedContext of this.boundedcontexts.values()) {
			for (const schema of boundedContext.schemas.values()) {
				if (schema.ref === ref) return schema;
			}
		}
	}

	getSchemaByRefOrThrow(ref: string): DataSchema {
		const schema = this.getSchemaByRef(ref);
		if (!schema) {
			throw new Error(`Schema with ref ${ref} not found`);
		}
		return schema;
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
			options: this.options,
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

	/** Checks the model against the DDD rules ODS can verify structurally. */
	validate(): Diagnostic[] {
		return validateWorkspace(this);
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
	/** The rules that hold across this context's instances (decision 27). */
	invariants = new Map<string, Invariant>();
	policies = new Map<string, Policy>();
	glossary = new Map<string, GlossaryTerm>();
	valueobjects = new Map<string, ValueObject>();
	schemas = new Map<string, DataSchema>();
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
			comments: options.comments,
			disposition: options.disposition,
		});
	}

	/** Declares this context downstream of another. */
	downstreamOf(
		upstream: BoundedContext,
		options: DirectedRelationshipOptions = {},
	): ContextRelationship {
		return upstream.upstreamOf(this, options);
	}

	partnerOf(
		other: BoundedContext,
		options: SymmetricRelationshipOptions = {},
	): ContextRelationship {
		return this.symmetricWith("partnership", other, options);
	}

	sharesKernelWith(
		other: BoundedContext,
		options: SymmetricRelationshipOptions = {},
	): ContextRelationship {
		return this.symmetricWith("shared-kernel", other, options);
	}

	separateWaysFrom(
		other: BoundedContext,
		options: SymmetricRelationshipOptions = {},
	): ContextRelationship {
		return this.symmetricWith("separate-ways", other, options);
	}

	private symmetricWith(
		type: ods.SymmetricRelationshipType,
		other: BoundedContext,
		options: SymmetricRelationshipOptions,
	): ContextRelationship {
		return this.workspace.addRelationship({
			type,
			participants: [this, other],
			description: options.description,
			comments: options.comments,
			disposition: options.disposition,
		});
	}

	addService(name: string, attributes: ServiceAttributes): Service {
		return new Service(this, name, attributes);
	}

	addAggregate(name: string, attributes: AggregateAttributes): Aggregate {
		return new Aggregate(this, name, attributes);
	}

	/**
	 * Declares a rule that holds across the instances or the aggregates of this
	 * context — uniqueness, a quota, a limit, conservation. Chain
	 * `.constrains(...)` with what the rule is about and with the operations
	 * that guard it, since no single instance can see the others.
	 */
	addInvariant(name: string, attributes: InvariantAttributes): Invariant {
		return new Invariant(this, name, attributes);
	}

	addPolicy(name: string, attributes: PolicyAttributes): Policy {
		return new Policy(this, name, attributes);
	}

	addTerm(name: string, attributes: GlossaryTermAttributes): GlossaryTerm {
		return new GlossaryTerm(this, name, attributes);
	}

	/**
	 * Declares a value this context defines once, for any of its aggregates to
	 * use: a value object is part of the ubiquitous language of the context,
	 * not of one aggregate.
	 */
	addValueObject(name: string, attributes: ValueObjectAttributes): ValueObject {
		return new ValueObject(this, name, attributes);
	}

	/** Declares a payload shape consumables of this context can carry. */
	addSchema(name: string, attributes: DataSchemaAttributes = {}): DataSchema {
		return new DataSchema(this, name, attributes);
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
			invariants: asRecords(this.invariants),
			services: asRecords(this.services),
			policies: asRecords(this.policies),
			glossary: asRecords(this.glossary),
			valueobjects: asRecords(this.valueobjects),
			schemas: asRecords(this.schemas),
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
			invariants: asRecords(this.invariants),
		};
	}
}

export type ConsumableAttributes = {
	description: string;
	pattern?: UpstreamRole;
	type: ods.ConsumableType;
	/** Stays inside the context; never offered to other contexts. */
	internal?: boolean;
	/** The payload the caller sends, one of the context's schemas. */
	schema?: DataSchema;
	/**
	 * For operations: the payload shape the caller gets back. Absent means the
	 * operation returns nothing worth naming. Never valid on an event.
	 */
	returns?: DataSchema;
	id?: string;
} & EvidenceOptions;

export class Consumable
	implements Visitable, Evidenced, SchemaConvertible<ods.ConsumableSchema>
{
	id: string;
	name: string;
	description: string;
	pattern?: UpstreamRole;
	type: ods.ConsumableType;
	internal: boolean;
	schema?: DataSchema;
	/** For operations: the payload shape the caller gets back. */
	returns?: DataSchema;
	/** For operations: the event consumables this operation may raise. */
	raisedEvents: Consumable[] = [];
	provider: Aggregate | Service;
	consumptions: Consumption[] = [];
	comments: ods.Comment[];
	disposition?: ods.Disposition;

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
		this.internal = attributes.internal ?? false;
		this.schema = attributes.schema;
		this.returns = attributes.returns;
		this.comments = attributes.comments ?? [];
		this.disposition = normaliseDisposition(attributes.disposition);
		this.provider = provider;
		provider.consumables.set(this.id, this);
	}

	/** Declares an event consumable this operation may raise. */
	raises(...events: Consumable[]): this {
		for (const event of events) {
			if (!this.raisedEvents.includes(event)) this.raisedEvents.push(event);
		}
		return this;
	}

	/** The bounded context this consumable belongs to, through its provider. */
	get boundedcontext(): BoundedContext {
		return this.provider.boundedcontext;
	}

	/**
	 * The invariants that name this consumable: the rules it has to uphold every
	 * time it runs, whether its own aggregate's or its context's. No invariant
	 * reaches across a context, so the search stays inside this one.
	 */
	get invariants(): Invariant[] {
		const bc = this.boundedcontext;
		const out: Invariant[] = [];
		for (const aggregate of bc.aggregates.values())
			for (const invariant of aggregate.invariants.values())
				if (invariant.targets.includes(this)) out.push(invariant);
		for (const invariant of bc.invariants.values())
			if (invariant.targets.includes(this)) out.push(invariant);
		return out;
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
			internal: this.internal || undefined,
			schema: this.schema && { $ref: this.schema.ref },
			returns: this.returns && { $ref: this.returns.ref },
			raises: this.raisedEvents.length
				? this.raisedEvents.map((it) => ({ $ref: it.ref }))
				: undefined,
			comments: this.comments.length ? this.comments : undefined,
			disposition: this.disposition,
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

	/** The context this entity's aggregate belongs to. */
	get boundedcontext(): BoundedContext {
		return this.aggregate.boundedcontext;
	}

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

	uses(
		target: Entity | ValueObject,
		label: string,
		cardinality?: RelationCardinality,
	) {
		this.addRelation(target, {
			label,
			relation: RelationType.Uses,
			cardinality,
		});
	}

	includes(
		target: Entity | ValueObject,
		label: string,
		cardinality?: RelationCardinality,
	) {
		this.addRelation(target, {
			label,
			relation: RelationType.Includes,
			cardinality,
		});
	}

	references(
		target: Entity | ValueObject,
		label: string,
		cardinality?: RelationCardinality,
	) {
		this.addRelation(target, {
			label,
			relation: RelationType.References,
			cardinality,
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
	boundedcontext: BoundedContext;

	get path(): string {
		return `${this.boundedcontext.path}/valueobjects/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		boundedcontext: BoundedContext,
		name: string,
		attributes: ValueObjectAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.boundedcontext = boundedcontext;
		this.boundedcontext.valueobjects.set(this.id, this);
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

	uses(
		target: Entity | ValueObject,
		label: string,
		cardinality?: RelationCardinality,
	) {
		this.addRelation(target, {
			label,
			relation: RelationType.Uses,
			cardinality,
		});
	}

	includes(
		target: Entity | ValueObject,
		label: string,
		cardinality?: RelationCardinality,
	) {
		this.addRelation(target, {
			label,
			relation: RelationType.Includes,
			cardinality,
		});
	}

	references(
		target: Entity | ValueObject,
		label: string,
		cardinality?: RelationCardinality,
	) {
		this.addRelation(target, {
			label,
			relation: RelationType.References,
			cardinality,
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
}

export type InvariantAttributes = {
	description: string;
	id?: string;
};
/**
 * What an invariant can be declared over: the elements it holds true of, and
 * the consumables that have to uphold it, for a rule about a transition rather
 * than about a value (decision 19).
 */
export type Constrainable = Entity | ValueObject | Attribute | Consumable;

/** "Owner.attribute" for an attribute, the element's name otherwise. */
export function constrainableLabel(target: Constrainable): string {
	return target instanceof Attribute
		? `${target.owner.name}.${target.name}`
		: target.name;
}

/**
 * Which boundary a rule is kept true inside: an aggregate's invariant holds
 * inside that aggregate on every save, a context's holds across the instances
 * and aggregates of the context and is checked by an operation (decision 27).
 */
export type InvariantKind = "aggregate" | "context";

export class Invariant
	implements Visitable, SchemaConvertible<ods.InvariantSchema>
{
	id: string;
	name: string;
	description: string;
	/** The aggregate or the bounded context this rule belongs to. */
	owner: Aggregate | BoundedContext;
	/** The elements this invariant constrains. */
	targets: Constrainable[] = [];

	get path(): string {
		return `${this.owner.path}/invariants/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	/** Whether the rule is kept true by one aggregate or by the whole context. */
	get kind(): InvariantKind {
		return this.owner instanceof Aggregate ? "aggregate" : "context";
	}

	/** The context the rule belongs to, directly or through its aggregate. */
	get boundedcontext(): BoundedContext {
		return this.owner instanceof Aggregate
			? this.owner.boundedcontext
			: this.owner;
	}

	constructor(
		owner: Aggregate | BoundedContext,
		name: string,
		attributes: InvariantAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.owner = owner;
		this.owner.invariants.set(this.id, this);
	}

	/**
	 * The consumables this invariant is a rule for: for an aggregate's rule the
	 * operations that make the transition it describes, for a context's rule the
	 * operations that check it before acting. Either way, the ones that have to
	 * uphold it.
	 */
	get guarded(): Consumable[] {
		return this.targets.filter((it) => it instanceof Consumable);
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
	cardinality?: RelationCardinality;
};

export class EntityRelation
	implements Visitable, SchemaConvertible<ods.EntityRelationSchema>
{
	source: Entity | ValueObject;
	target: Entity | ValueObject;
	label?: string;
	relation: EntityRelationType;
	cardinality?: RelationCardinality;

	constructor(
		source: Entity | ValueObject,
		target: Entity | ValueObject,
		attributes: EntityRelationAttributes,
	) {
		this.source = source;
		this.target = target;
		this.label = attributes.label;
		this.relation = attributes.relation;
		this.cardinality = attributes.cardinality;
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
			cardinality: this.cardinality,
		};
	}
}

/**
 * What can be named as making a consumption: one of the consumer's own
 * operations, or a policy of the consumer's context that issues them.
 */
export type ConsumptionCaller = Consumable | Policy;

export type ConsumptionAttributes = {
	pattern?: DownstreamRole;
	/**
	 * The consumer's own operations or policies behind this exchange. Absent
	 * means the whole consumer (decision 21).
	 */
	by?: ConsumptionCaller[];
} & EvidenceOptions;

export class Consumption
	implements Visitable, Evidenced, SchemaConvertible<ods.ConsumptionSchema>
{
	consumer: Aggregate | Service;
	consumable: Consumable;
	pattern?: DownstreamRole;
	/** The consumer's own operations or policies that make this exchange. */
	by: ConsumptionCaller[];
	comments: ods.Comment[];
	disposition?: ods.Disposition;

	constructor(
		consumer: Aggregate | Service,
		consumable: Consumable,
		attributes: ConsumptionAttributes,
	) {
		this.consumer = consumer;
		this.consumer.consumptions.push(this);
		this.consumable = consumable;
		this.pattern = attributes.pattern;
		this.by = attributes.by ?? [];
		this.comments = attributes.comments ?? [];
		this.disposition = normaliseDisposition(attributes.disposition);
		this.consumable.consumptions.push(this);
	}

	accept(v: Visitor) {
		return v.visitConsumption(this);
	}

	toSchema(): ods.ConsumptionSchema {
		return {
			consumable: { $ref: this.consumable.ref },
			pattern: this.pattern,
			by: this.by.length ? this.by.map((it) => ({ $ref: it.ref })) : undefined,
			comments: this.comments.length ? this.comments : undefined,
			disposition: this.disposition,
		};
	}
}

export type DirectedRelationshipOptions = {
	type?: ods.DirectedRelationshipType;
	upstreamRoles?: UpstreamRole[];
	downstreamRoles?: DownstreamRole[];
	description?: string;
} & EvidenceOptions;

/** What `partnerOf`, `sharesKernelWith` and `separateWaysFrom` accept. */
export type SymmetricRelationshipOptions = {
	description?: string;
} & EvidenceOptions;

export type ContextRelationshipAttributes =
	| ({
			type: ods.DirectedRelationshipType;
			upstream: BoundedContext;
			downstream: BoundedContext;
			upstreamRoles?: UpstreamRole[];
			downstreamRoles?: DownstreamRole[];
			description?: string;
	  } & EvidenceOptions)
	| ({
			type: ods.SymmetricRelationshipType;
			participants: [BoundedContext, BoundedContext];
			description?: string;
	  } & EvidenceOptions);

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
	implements
		Visitable,
		Evidenced,
		SchemaConvertible<ods.ContextRelationshipSchema>
{
	workspace: Workspace;
	type: ods.ContextRelationshipType;
	source: BoundedContext;
	target: BoundedContext;
	upstreamRoles: UpstreamRole[];
	downstreamRoles: DownstreamRole[];
	description?: string;
	comments: ods.Comment[];
	disposition?: ods.Disposition;

	constructor(workspace: Workspace, attributes: ContextRelationshipAttributes) {
		this.workspace = workspace;
		this.type = attributes.type;
		this.description = attributes.description;
		this.comments = attributes.comments ?? [];
		this.disposition = normaliseDisposition(attributes.disposition);
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

	/**
	 * A relationship is the one model element with no id of its own, so its ref
	 * is derived from what does identify it: the two contexts it joins and the
	 * pattern that joins them. `~` separates the three parts because it is the
	 * one ref-safe character no id can contain.
	 */
	get path(): string {
		return `relationships/${this.source.id}~${this.type}~${this.target.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	involves(bc: BoundedContext): boolean {
		return this.source === bc || this.target === bc;
	}

	accept(v: Visitor) {
		return v.visitContextRelationship(this);
	}

	toSchema(): ods.ContextRelationshipSchema {
		const evidence = {
			comments: this.comments.length ? this.comments : undefined,
			disposition: this.disposition,
		};
		if (isDirectedRelationshipType(this.type)) {
			return {
				type: this.type,
				upstream: { $ref: this.source.ref },
				downstream: { $ref: this.target.ref },
				upstreamRoles: this.upstreamRoles,
				downstreamRoles: this.downstreamRoles,
				description: this.description,
				...evidence,
			};
		}
		return {
			type: this.type,
			participants: [{ $ref: this.source.ref }, { $ref: this.target.ref }],
			description: this.description,
			...evidence,
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
	/** True when the attribute is sometimes absent; absent means required. */
	optional?: boolean;
	valueobject?: ValueObject;
	/** The schema that models this attribute's type, when it is a shape of its own. */
	schema?: DataSchema;
	/** The root entity this attribute holds the identity of, in any context. */
	identifies?: Entity;
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
	/** True when the attribute is sometimes absent; false means required. */
	optional: boolean;
	valueobject?: ValueObject;
	/** The schema that models this attribute's type, when it is a shape of its own. */
	schema?: DataSchema;
	/** The root entity this attribute holds the identity of, in any context. */
	identifies?: Entity;
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
		this.optional = attributes.optional ?? false;
		this.valueobject = attributes.valueobject;
		this.schema = attributes.schema;
		this.identifies = attributes.identifies;
		this.owner = owner;
		this.owner.attributes.set(this.id, this);
	}

	toSchema(): ods.AttributeSchema {
		return {
			name: this.name,
			type: this.type,
			description: this.description,
			identity: this.identity || undefined,
			optional: this.optional || undefined,
			valueobject: this.valueobject && { $ref: this.valueobject.ref },
			schema: this.schema && { $ref: this.schema.ref },
			identifies: this.identifies && { $ref: this.identifies.ref },
		};
	}
}

export type DataSchemaAttributes = {
	description?: string;
	id?: string;
};

/** A payload shape owned by a bounded context and carried by its consumables. */
export class DataSchema
	implements Visitable, SchemaConvertible<ods.DataSchemaSchema>, AttributeOwner
{
	id: string;
	name: string;
	description?: string;
	attributes = new Map<string, Attribute>();
	boundedcontext: BoundedContext;

	get path(): string {
		return `${this.boundedcontext.path}/schemas/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		boundedcontext: BoundedContext,
		name: string,
		attributes: DataSchemaAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.boundedcontext = boundedcontext;
		this.boundedcontext.schemas.set(this.id, this);
	}

	addAttribute(name: string, options: AttributeOptions): Attribute {
		return new Attribute(this, name, options);
	}

	/**
	 * Consumables across the workspace that depend on this shape, whether they
	 * send it as their payload or answer with it. Both are the same promise:
	 * removing an attribute breaks whoever is on the other end.
	 */
	get consumables(): Consumable[] {
		const out: Consumable[] = [];
		for (const bc of this.boundedcontext.workspace.boundedcontexts.values()) {
			for (const p of [...bc.aggregates.values(), ...bc.services.values()])
				for (const c of p.consumables.values())
					if (c.schema === this || c.returns === this) out.push(c);
		}
		return out;
	}

	accept(v: Visitor) {
		return v.visitDataSchema(this);
	}

	toSchema(): ods.DataSchemaSchema {
		return {
			name: this.name,
			description: this.description,
			attributes: asRecords(this.attributes),
		};
	}
}

export type PolicyAttributes = {
	description: string;
	id?: string;
};

/**
 * A reaction that lives in a bounded context: when any of its event
 * consumables happen, it issues its operation consumables. Either side may
 * belong to another context.
 */
export class Policy implements Visitable, SchemaConvertible<ods.PolicySchema> {
	id: string;
	name: string;
	description: string;
	boundedcontext: BoundedContext;
	/** Event consumables that trigger the policy. */
	events: Consumable[] = [];
	/** Operation consumables the policy issues. */
	commands: Consumable[] = [];

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

	/** Adds a triggering event consumable. */
	on(...events: Consumable[]): this {
		for (const event of events) {
			if (!this.events.includes(event)) this.events.push(event);
		}
		return this;
	}

	/** Adds an operation consumable to issue. */
	then(...commands: Consumable[]): this {
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

/** Anything in the workspace that can be pointed at by ref. */
export interface Referenceable {
	ref: string;
	name: string;
}

export type GlossaryTermAttributes = {
	definition: string;
	aliases?: string[];
	/** The model element that embodies this term. */
	embodiedBy?: Referenceable;
	id?: string;
};

/** A term of a bounded context's ubiquitous language. */
export class GlossaryTerm
	implements Visitable, SchemaConvertible<ods.GlossaryTermSchema>
{
	id: string;
	name: string;
	definition: string;
	aliases: string[];
	embodiedBy?: Referenceable;
	boundedcontext: BoundedContext;

	get path(): string {
		return `${this.boundedcontext.path}/glossary/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		boundedcontext: BoundedContext,
		name: string,
		attributes: GlossaryTermAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.definition = attributes.definition;
		this.aliases = attributes.aliases ?? [];
		this.embodiedBy = attributes.embodiedBy;
		this.boundedcontext = boundedcontext;
		this.boundedcontext.glossary.set(this.id, this);
	}

	/** Points the term at the model element that embodies it. */
	embody(target: Referenceable): this {
		this.embodiedBy = target;
		return this;
	}

	accept(v: Visitor) {
		return v.visitGlossaryTerm(this);
	}

	toSchema(): ods.GlossaryTermSchema {
		return {
			name: this.name,
			definition: this.definition,
			aliases: this.aliases.length ? this.aliases : undefined,
			embodiedBy: this.embodiedBy && { $ref: this.embodiedBy.ref },
		};
	}
}
