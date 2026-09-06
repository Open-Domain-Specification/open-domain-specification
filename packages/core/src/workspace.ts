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

/**
 * A `$ref` a loaded file wrote that names nothing, or names the wrong kind of
 * thing for where it was written.
 *
 * It is a fact about the file rather than about the model, which is why the
 * workspace carries it instead of the element that wrote it: the link is left
 * unset, so there is nothing on the element to read it back from. The
 * `unresolved-ref` rule turns each of these into an error, and every other
 * rule goes on running over what did load — one typo costs an author that one
 * diagnostic and not the whole file's worth (card 100).
 */
export type UnresolvedReference = {
	/** The element that wrote the ref, which is where the diagnostic lands. */
	ref: string;
	/** How that element is named in the message: `Process "Fulfilment"`. */
	owner: string;
	/** The field it was written in, in the author's words: `on`, `returns`. */
	field: string;
	/**
	 * Where inside the element, when the field alone does not say which of
	 * several: `its consumption of "Decide"`. Absent when it does.
	 */
	where?: string;
	/** The ref as written. */
	target: string;
	/** What that field may name, as a phrase: "an event, or an answer". */
	expected: string;
	/** Whether anything at all in the workspace answers to the ref. */
	present: boolean;
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
	/**
	 * The `$ref`s a loaded file wrote that resolved to nothing, or to the wrong
	 * kind of thing. Empty for a workspace built through the DSL, where a
	 * reference is an object and the compiler is what refuses a wrong one.
	 * See {@link UnresolvedReference}.
	 */
	readonly unresolved: UnresolvedReference[] = [];

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

	/**
	 * The consumption a {@link Consumption.ref} points at, if any. Like a
	 * relationship, a consumption is a pairing rather than a named element, so
	 * it is found here rather than through {@link Workspace.getByRef}, which
	 * answers with things that have a name.
	 */
	findConsumption(ref: string): Consumption | undefined {
		for (const consumer of [...this.aggregates(), ...this.services()]) {
			for (const consumption of consumer.consumptions) {
				if (consumption.ref === ref) return consumption;
			}
		}
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

	/**
	 * An invariant of any value object, aggregate or context: the three kinds a
	 * rule may be kept true by (decision 27).
	 */
	getInvariantByRef(ref: string): Invariant | undefined {
		const inAggregate = this.findAggregateMember((it) => it.invariants, ref);
		if (inAggregate) return inAggregate;
		for (const bc of this.boundedcontexts.values()) {
			for (const invariant of bc.invariants.values()) {
				if (invariant.ref === ref) return invariant;
			}
			for (const vo of bc.valueobjects.values()) {
				for (const invariant of vo.invariants.values()) {
					if (invariant.ref === ref) return invariant;
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

	/**
	 * Resolves an answer ref: `<operation ref>/returns`, or
	 * `<operation ref>/rejects/<schema id>` for one of its refusals. The shape
	 * is looked up among the ones that operation declares, because an answer is
	 * the operation coming back and nothing else can say what it comes back as
	 * (decision 23, third amendment).
	 */
	getAnswerByRef(ref: string): Answer | undefined {
		// A completion is the answer of an operation that returns nothing, so it
		// resolves only when there is nothing to return; an operation with an
		// answer of its own is named by that (decision 13, second amendment).
		if (ref.endsWith("/completed")) {
			const operation = this.getConsumableByRef(
				ref.slice(0, -"/completed".length),
			);
			if (!operation || operation.returns) return undefined;
			return operation.completed();
		}
		const [operationRef, rejectionId] = ref.endsWith("/returns")
			? [ref.slice(0, -"/returns".length)]
			: ref.split("/rejects/");
		if (!operationRef) return undefined;
		const operation = this.getConsumableByRef(operationRef);
		if (!operation) return undefined;
		if (rejectionId === undefined)
			return operation.returns ? operation.returned() : undefined;
		const rejection = operation.rejects.find((it) => it.id === rejectionId);
		return rejection && operation.rejected(rejection);
	}

	getAnswerByRefOrThrow(ref: string): Answer {
		const answer = this.getAnswerByRef(ref);
		if (!answer) {
			throw new Error(`Answer with ref ${ref} not found`);
		}
		return answer;
	}

	/**
	 * Resolves any ref a policy's `on`, or a process's `on` or `ends`, may
	 * name: an event, or an answer of an operation (decision 23).
	 */
	getReactionTriggerByRef(ref: string): ReactionTrigger | undefined {
		const target = this.getByRef(ref);
		return target instanceof Consumable || target instanceof Answer
			? target
			: undefined;
	}

	getReactionTriggerByRefOrThrow(ref: string): ReactionTrigger {
		const target = this.getReactionTriggerByRef(ref);
		if (!target) {
			throw new Error(`Consumable or Answer with ref ${ref} not found`);
		}
		return target;
	}

	/**
	 * Resolves any ref a process's `on` or `ends` may name: everything a
	 * policy's `on` may name, and the process's own deadlines (decision 23,
	 * fourth amendment).
	 */
	getProcessTriggerByRef(ref: string): ProcessTrigger | undefined {
		const target = this.getByRef(ref);
		return target instanceof Consumable ||
			target instanceof Answer ||
			target instanceof Deadline
			? target
			: undefined;
	}

	getProcessTriggerByRefOrThrow(ref: string): ProcessTrigger {
		const target = this.getProcessTriggerByRef(ref);
		if (!target) {
			throw new Error(
				`Consumable, Answer or Deadline with ref ${ref} not found`,
			);
		}
		return target;
	}

	/** Every deadline of every process, in declaration order. */
	private *allDeadlines(): Iterable<Deadline> {
		for (const boundedcontext of this.boundedcontexts.values())
			for (const process of boundedcontext.processes.values())
				yield* process.deadlines.values();
	}

	getDeadlineByRef(ref: string): Deadline | undefined {
		for (const deadline of this.allDeadlines()) {
			if (deadline.ref === ref) return deadline;
		}
	}

	getDeadlineByRefOrThrow(ref: string): Deadline {
		const deadline = this.getDeadlineByRef(ref);
		if (!deadline) {
			throw new Error(`Deadline with ref ${ref} not found`);
		}
		return deadline;
	}

	/** Resolves any ref a consumption's `by` may name. */
	getConsumptionCallerByRef(ref: string): ConsumptionCaller | undefined {
		const target = this.getByRef(ref);
		return target instanceof Consumable ||
			target instanceof Policy ||
			target instanceof Process
			? target
			: undefined;
	}

	getConsumptionCallerByRefOrThrow(ref: string): ConsumptionCaller {
		const target = this.getConsumptionCallerByRef(ref);
		if (!target) {
			throw new Error(
				`Consumable, Policy or Process with ref ${ref} not found`,
			);
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
			case "processes":
				return this.getProcessByRef(ref);
			case "deadlines":
				return this.getDeadlineByRef(ref);
			case "glossary":
				return this.getTermByRef(ref);
			case "attributes":
				return this.getAttributeByRef(ref);
			// An answer hangs off the operation it comes back from rather than
			// off a collection, so its shapes are read here: a refusal by the
			// `rejects` segment before the shape's id, and the successful answer
			// or the bare completion by a final `returns` or `completed`, which
			// no collection is named.
			case "rejects":
				return this.getAnswerByRef(ref);
			default:
				return ["returns", "completed"].includes(segments[segments.length - 1])
					? this.getAnswerByRef(ref)
					: undefined;
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

	private *processes(): Iterable<Process> {
		for (const boundedContext of this.boundedcontexts.values()) {
			yield* boundedContext.processes.values();
		}
	}

	getProcessByRef(ref: string): Process | undefined {
		this.debug(`Searching for process with ref: ${ref}`);
		for (const process of this.processes()) {
			if (process.ref === ref) {
				return process;
			}
		}
	}

	getProcessByRefOrThrow(ref: string): Process {
		const process = this.getProcessByRef(ref);
		if (!process) {
			throw new Error(`Process with ref ${ref} not found`);
		}
		return process;
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
	/** See {@link ods.BoundedContextSchema.external}. */
	external?: boolean;
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
	/** The reactions that hold state across events (decision 23). */
	processes = new Map<string, Process>();
	glossary = new Map<string, GlossaryTerm>();
	valueobjects = new Map<string, ValueObject>();
	schemas = new Map<string, DataSchema>();
	workspace: Workspace;
	subdomains = new Set<Subdomain>();
	bigBallOfMud: boolean;
	/** A system we integrate with and do not model inside (decision 28). */
	external: boolean;
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
		this.external = attributes.external ?? false;
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

	/**
	 * Declares a process: the reaction that remembers which of its events have
	 * arrived and acts when enough have. Give it `starts`, `on`, `issues` and
	 * `ends` here, or chain the methods of the same names when the consumables
	 * are declared after it.
	 */
	addProcess(name: string, attributes: ProcessAttributes): Process {
		return new Process(this, name, attributes);
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
			external: this.external || undefined,
			team: this.team && { $ref: this.team.ref },
			aggregates: asRecords(this.aggregates),
			invariants: asRecords(this.invariants),
			services: asRecords(this.services),
			policies: asRecords(this.policies),
			processes: asRecords(this.processes),
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
	 *
	 * A shape on its own is one of it; `{ schema, many: true }` is a list of
	 * it, which is what a search answers with (decision 13, amended). The two
	 * are written as one field so that a list can never be declared without
	 * the shape it is a list of.
	 */
	returns?: DataSchema | { schema: DataSchema; many?: boolean };
	/**
	 * For operations: the shapes the operation answers with when it refuses.
	 * Absent means it always succeeds, or refuses without a shape worth
	 * naming. Never valid on an event.
	 */
	rejects?: DataSchema[];
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
	/** Whether the answer is a list of {@link returns} rather than one of it. */
	returnsMany: boolean;
	/** For operations: the shapes the operation answers with when it refuses. */
	rejects: DataSchema[] = [];
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
		const returns = attributes.returns;
		const answer =
			returns instanceof DataSchema ? { schema: returns } : returns;
		this.returns = answer?.schema;
		this.returnsMany = answer?.many ?? false;
		this.rejects = attributes.rejects ?? [];
		this.comments = attributes.comments ?? [];
		this.disposition = normaliseDisposition(attributes.disposition);
		this.provider = provider;
		provider.consumables.set(this.id, this);
	}

	/**
	 * The answers this operation has been asked for, kept so that naming one
	 * twice names one object: a reaction's `on` is compared by identity, and
	 * the walk keys what it wakes by the answer itself.
	 */
	private readonly answersGiven = new Map<string, Answer>();

	/**
	 * The successful answer: what a caller gets back when this operation does
	 * what it was asked. An operation that returns nothing has no such answer,
	 * so asking for one is a mistake in the model that is refused here rather
	 * than carried as an answer with no shape; what it has instead is a
	 * {@link completed}.
	 */
	returned(): Answer {
		if (!this.returns)
			throw new Error(
				`Operation ${this.name} returns nothing, so it has no answer to wait for; wait on ${this.name}.completed() instead`,
			);
		return this.answerFor("returns", this.returns, false);
	}

	/**
	 * One refusal: what a caller gets back when this operation says no. The
	 * schema is named rather than looked up, because `consumable-kind` is where
	 * a refusal the operation never declared is reported.
	 */
	rejected(schema: DataSchema): Answer {
		return this.answerFor(`rejects/${schema.ref}`, schema, true);
	}

	/**
	 * The bare completion: this operation came back and did what it was asked,
	 * with nothing worth naming to say about it.
	 *
	 * A command that returns nothing still completes, and a process may wait on
	 * that: a provisioning workflow that finishes when the activation call
	 * succeeds names the completion rather than inventing a response shape or
	 * an event for a non-event (decision 13, second amendment). It is an answer
	 * with no shape, so it carries no attributes and nothing may be said about
	 * what it holds.
	 *
	 * Only an operation with no `returns` has one — an operation that answers
	 * with a shape says so through {@link returned}, and naming its completion
	 * as well would be two names for one call coming back. As with a refusal
	 * the operation never declared, that is reported by `consumable-kind`
	 * rather than refused here, because a model with a mistake in it still has
	 * to load and be validated.
	 */
	completed(): Answer {
		return this.answerFor("completed", undefined, false);
	}

	/**
	 * Every answer of this operation: what it comes back with when it succeeds
	 * — a shape, or the bare completion where it names none — then what it
	 * refuses with.
	 */
	get answers(): Answer[] {
		const succeeded = this.returns
			? [this.returned()]
			: this.type === "operation"
				? [this.completed()]
				: [];
		return [...succeeded, ...this.rejects.map((it) => this.rejected(it))];
	}

	private answerFor(
		key: string,
		schema: DataSchema | undefined,
		rejection: boolean,
	): Answer {
		const existing = this.answersGiven.get(key);
		if (existing) return existing;
		const answer = new Answer(this, schema, rejection);
		this.answersGiven.set(key, answer);
		return answer;
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
			returns: this.returns && {
				$ref: this.returns.ref,
				many: this.returnsMany || undefined,
			},
			rejects: this.rejects.length
				? this.rejects.map((it) => ({ $ref: it.ref }))
				: undefined,
			raises: this.raisedEvents.length
				? this.raisedEvents.map((it) => ({ $ref: it.ref }))
				: undefined,
			comments: this.comments.length ? this.comments : undefined,
			disposition: this.disposition,
		};
	}
}

/**
 * One answer of one operation: what that call comes back with.
 *
 * An answer is named by where it comes from, not by the shape alone. Schemas
 * are shared across consumables (decision 09), so two operations may refuse
 * with the same `PaymentDeclined`; a reactor waiting on the shape would be
 * woken by both, and the reaction walk would draw a causal step from a call
 * nobody was waiting on. Naming the origin says which call came back:
 * `<operation ref>/returns` is the successful answer, `<operation
 * ref>/rejects/<schema id>` one of its refusals (decision 23, third
 * amendment), and `<operation ref>/completed` the bare completion of an
 * operation that returns nothing (decision 13, second amendment).
 *
 * A completion is the one answer with no shape. There is nothing to say about
 * what it carries, because it carries nothing: it says only that the call came
 * back having done what it was asked, which is the whole of what the caller of
 * a command learns. It is still named by its origin, so it still wakes only
 * whoever named that call.
 *
 * Answers are made by {@link Consumable.returned}, {@link Consumable.rejected}
 * and {@link Consumable.completed} and kept by the operation, so the same
 * answer is the same object wherever it is named and the walk can key its
 * listeners by it.
 */
export class Answer implements Referenceable {
	/** The operation this answer comes back from. */
	readonly operation: Consumable;
	/** The shape it comes back as; absent on a bare completion. */
	readonly schema?: DataSchema;
	/** Whether this is a refusal rather than the successful answer. */
	readonly rejection: boolean;

	constructor(
		operation: Consumable,
		schema: DataSchema | undefined,
		rejection: boolean,
	) {
		this.operation = operation;
		this.schema = schema;
		this.rejection = rejection;
	}

	/**
	 * Whether this is the bare completion of an operation that returns nothing:
	 * the call came back, and there is no shape to read.
	 */
	get completion(): boolean {
		return this.schema === undefined;
	}

	get ref(): string {
		if (!this.schema) return `${this.operation.ref}/completed`;
		return this.rejection
			? `${this.operation.ref}/rejects/${this.schema.id}`
			: `${this.operation.ref}/returns`;
	}

	/**
	 * What the answer is read as in a list of triggers, and what labels the one
	 * flow-map edge it carries: the shape it came back as, or — for a
	 * completion, which came back as nothing — that the call completes.
	 */
	get name(): string {
		return this.schema ? this.schema.name : "completes";
	}

	/**
	 * The shape's description, which is what the answer carries. A completion
	 * carries nothing, so what it says is what the call it came back from says.
	 */
	get description(): string | undefined {
		return this.schema ? this.schema.description : this.operation.description;
	}

	/**
	 * Whether the answer is a list of the shape rather than one of it. Only a
	 * successful answer with a shape may be: a refusal says why the call was
	 * told no, which happens once, and a completion has nothing to be many of
	 * (decision 13, amended).
	 */
	get many(): boolean {
		return !this.rejection && !!this.schema && this.operation.returnsMany;
	}

	/** Where the answer comes from, in words: "X returns many Y". */
	get origin(): string {
		if (!this.schema) return `${this.operation.name} completes`;
		const verb = this.rejection
			? "rejects with"
			: this.many
				? "returns many"
				: "returns";
		return `${this.operation.name} ${verb} ${this.schema.name}`;
	}

	/** The context the call went to, which is where the answer comes from. */
	get boundedcontext(): BoundedContext {
		return this.operation.boundedcontext;
	}

	/**
	 * Whether the operation really answers this way. A refusal is written by
	 * naming a schema, so the DSL can name one the operation never declared;
	 * `consumable-kind` reports that rather than the constructor refusing it,
	 * because a model with a mistake in it still has to load and be validated.
	 *
	 * A completion is declared by an operation that names no `returns`. An
	 * operation answering with a shape says so through that shape, so its bare
	 * completion would be a second name for one call coming back; an event is
	 * never called at all. Neither has a completion to wait on.
	 */
	get declared(): boolean {
		if (!this.schema)
			return this.operation.type === "operation" && !this.operation.returns;
		return this.rejection
			? this.operation.rejects.includes(this.schema)
			: this.operation.returns === this.schema;
	}
}

/** Anything that may be a kind of another of its own sort (decision 22). */
type Specialisable = {
	specialises?: Specialisable;
	attributes: Map<string, Attribute>;
	relations: EntityRelation[];
};

/**
 * The chain of parents above a subtype, nearest first.
 *
 * Cycle-safe on purpose: two things declared kinds of each other is a model
 * `specialisation-cycle` reports, and every reader of the chain — a rule, a
 * page, the relation map — has to survive being handed one rather than hang.
 */
function ancestorsOf<T extends Specialisable>(node: T): T[] {
	const chain: T[] = [];
	const seen = new Set<Specialisable>([node]);
	let parent = node.specialises as T | undefined;
	while (parent && !seen.has(parent)) {
		chain.push(parent);
		seen.add(parent);
		parent = parent.specialises as T | undefined;
	}
	return chain;
}

export type EntityAttributes = {
	description: string;
	root?: boolean;
	/** The entity this one is a kind of; see {@link Entity.specialises}. */
	specialises?: Entity;
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
	/**
	 * The entity this one is a kind of, when it is one: a LoanAccount is an
	 * Account and has everything an Account has, plus its own (decision 22).
	 * The parent is an entity of the same aggregate.
	 */
	specialises?: Entity;

	/** The context this entity's aggregate belongs to. */
	get boundedcontext(): BoundedContext {
		return this.aggregate.boundedcontext;
	}

	/** The entities of this aggregate that are a kind of this one. */
	get kinds(): Entity[] {
		return Array.from(this.aggregate.entities.values()).filter(
			(it) => it.specialises === this,
		);
	}

	/** Every entity this one is a kind of, nearest parent first. */
	get ancestors(): Entity[] {
		return ancestorsOf(this);
	}

	/** The attributes this entity has because a parent declares them. */
	get inheritedAttributes(): Attribute[] {
		return this.ancestors.flatMap((it) => [...it.attributes.values()]);
	}

	/** Everything this entity holds: its own attributes, then the inherited ones. */
	get allAttributes(): Attribute[] {
		return [...this.attributes.values(), ...this.inheritedAttributes];
	}

	/** The relations this entity has because a parent declares them. */
	get inheritedRelations(): EntityRelation[] {
		return this.ancestors.flatMap((it) => it.relations);
	}

	/** Everything this entity points at: its own relations, then the inherited ones. */
	get allRelations(): EntityRelation[] {
		return [...this.relations, ...this.inheritedRelations];
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
		this.specialises = attributes.specialises;
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

	/**
	 * Declares that this holds the target: the label is the phrase the
	 * relation map draws ("lives at"), the cardinality how many. Where this
	 * uses one value object for more than one attribute, `{ for }` names the
	 * attribute this relation draws, so the phrase need not be a field name.
	 */
	uses(
		target: Entity | ValueObject,
		label: string,
		cardinality?: RelationCardinality,
		options: EntityRelationOptions = {},
	) {
		this.addRelation(target, {
			...options,
			label,
			relation: RelationType.Uses,
			cardinality,
		});
	}

	includes(
		target: Entity | ValueObject,
		label: string,
		cardinality?: RelationCardinality,
		options: EntityRelationOptions = {},
	) {
		this.addRelation(target, {
			...options,
			label,
			relation: RelationType.Includes,
			cardinality,
		});
	}

	references(
		target: Entity | ValueObject,
		label: string,
		cardinality?: RelationCardinality,
		options: EntityRelationOptions = {},
	) {
		this.addRelation(target, {
			...options,
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
			specialises: this.specialises && { $ref: this.specialises.ref },
			attributes: asRecords(this.attributes),
			relations: asArray(this.relations),
		};
	}
}

export type ValueObjectAttributes = {
	description: string;
	/** The value object this one is a kind of; see {@link ValueObject.specialises}. */
	specialises?: ValueObject;
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
	/** The rules that hold of every instance of this value (decision 27). */
	invariants = new Map<string, Invariant>();
	boundedcontext: BoundedContext;
	/**
	 * The value object this one is a kind of, when it is one: a nominal ledger
	 * account is a ledger account and has everything one has, plus its own
	 * (decision 22). The parent belongs to this context, or to a context this
	 * one shares a kernel with.
	 */
	specialises?: ValueObject;

	/**
	 * The value objects that are a kind of this one, anywhere in the
	 * workspace: a kernel's value object is specialised by the contexts that
	 * borrow it, so the kinds of one are not all in its own context.
	 */
	get kinds(): ValueObject[] {
		const out: ValueObject[] = [];
		for (const bc of this.boundedcontext.workspace.boundedcontexts.values())
			for (const vo of bc.valueobjects.values())
				if (vo.specialises === this) out.push(vo);
		return out;
	}

	/** Every value object this one is a kind of, nearest parent first. */
	get ancestors(): ValueObject[] {
		return ancestorsOf(this);
	}

	/** The attributes this value object has because a parent declares them. */
	get inheritedAttributes(): Attribute[] {
		return this.ancestors.flatMap((it) => [...it.attributes.values()]);
	}

	/** Everything this value object holds: its own attributes, then the inherited ones. */
	get allAttributes(): Attribute[] {
		return [...this.attributes.values(), ...this.inheritedAttributes];
	}

	/** The relations this value object has because a parent declares them. */
	get inheritedRelations(): EntityRelation[] {
		return this.ancestors.flatMap((it) => it.relations);
	}

	/** Everything this value object points at: its own relations, then the inherited ones. */
	get allRelations(): EntityRelation[] {
		return [...this.relations, ...this.inheritedRelations];
	}

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
		this.specialises = attributes.specialises;
		this.boundedcontext = boundedcontext;
		this.boundedcontext.valueobjects.set(this.id, this);
	}

	addAttribute(name: string, options: AttributeOptions): Attribute {
		return new Attribute(this, name, options);
	}

	/**
	 * Declares a rule that holds of every instance of this value: chain
	 * `.constrains(...)` with this value object's own attributes. It needs no
	 * guard, because a value that breaks it is never constructed.
	 */
	addInvariant(name: string, attributes: InvariantAttributes): Invariant {
		return new Invariant(this, name, attributes);
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

	/**
	 * Declares that this holds the target: the label is the phrase the
	 * relation map draws ("lives at"), the cardinality how many. Where this
	 * uses one value object for more than one attribute, `{ for }` names the
	 * attribute this relation draws, so the phrase need not be a field name.
	 */
	uses(
		target: Entity | ValueObject,
		label: string,
		cardinality?: RelationCardinality,
		options: EntityRelationOptions = {},
	) {
		this.addRelation(target, {
			...options,
			label,
			relation: RelationType.Uses,
			cardinality,
		});
	}

	includes(
		target: Entity | ValueObject,
		label: string,
		cardinality?: RelationCardinality,
		options: EntityRelationOptions = {},
	) {
		this.addRelation(target, {
			...options,
			label,
			relation: RelationType.Includes,
			cardinality,
		});
	}

	references(
		target: Entity | ValueObject,
		label: string,
		cardinality?: RelationCardinality,
		options: EntityRelationOptions = {},
	) {
		this.addRelation(target, {
			...options,
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
			specialises: this.specialises && { $ref: this.specialises.ref },
			attributes: asRecords(this.attributes),
			relations: asArray(this.relations),
			invariants: asRecords(this.invariants),
		};
	}
}

export type InvariantAttributes = {
	description: string;
	/** Whether the rule is a precondition; see {@link Invariant.precondition}. */
	precondition?: boolean;
	/** Whether the rule is a postcondition; see {@link Invariant.postcondition}. */
	postcondition?: boolean;
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
 * Which boundary a rule is kept true inside: a value object's invariant holds
 * by construction of the value, an aggregate's holds inside that aggregate on
 * every save, and a context's holds across the instances and aggregates of the
 * context and is checked by an operation before it acts (decision 27).
 */
export type InvariantKind = "value" | "aggregate" | "context";

export class Invariant
	implements Visitable, SchemaConvertible<ods.InvariantSchema>
{
	id: string;
	name: string;
	description: string;
	/** The value object, aggregate or bounded context this rule belongs to. */
	owner: Aggregate | BoundedContext | ValueObject;
	/** The elements this invariant constrains. */
	targets: Constrainable[] = [];
	/**
	 * Whether the rule is a precondition: checked before the operation it names
	 * runs, and not kept true afterwards. What it was checked against — a
	 * balance, an entitlement, another context's answer — may move on the
	 * moment the call returns.
	 *
	 * It is stated rather than inferred from naming an operation, because those
	 * are two different facts: which operation keeps a rule, and what kind of
	 * rule it is. `PostEntry` must produce balanced postings and the rule is
	 * still true after it; the operation is named for responsibility, not to
	 * weaken the rule (decision 27, second amendment).
	 */
	precondition: boolean;
	/**
	 * Whether the rule is a postcondition: a guarantee about what the operation
	 * it names answers with. Every returned itinerary meets the requested
	 * deadline; every quoted premium is inside the band the schedule allows.
	 *
	 * It is the third thing an invariant can be, and neither of the other two.
	 * The answer does not exist before the call, so there is nothing to check
	 * beforehand, and it is saved nowhere afterwards, so no aggregate keeps it
	 * true: what holds it is the operation, every time it answers (decision 19,
	 * third amendment). Exclusive with {@link precondition}, which is
	 * `postcondition-names-operation`'s to report.
	 */
	postcondition: boolean;

	get path(): string {
		return `${this.owner.path}/invariants/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	/** Whether the rule is kept true by a value, by one aggregate or by the whole context. */
	get kind(): InvariantKind {
		if (this.owner instanceof ValueObject) return "value";
		return this.owner instanceof Aggregate ? "aggregate" : "context";
	}

	/** The context the rule belongs to, directly or through its owner. */
	get boundedcontext(): BoundedContext {
		return this.owner instanceof BoundedContext
			? this.owner
			: this.owner.boundedcontext;
	}

	constructor(
		owner: Aggregate | BoundedContext | ValueObject,
		name: string,
		attributes: InvariantAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.precondition = attributes.precondition ?? false;
		this.postcondition = attributes.postcondition ?? false;
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
			precondition: this.precondition || undefined,
			postcondition: this.postcondition || undefined,
			constrains: this.targets.map((it) => ({ $ref: it.ref })),
		};
	}
}

export type EntityRelationAttributes = {
	label?: string;
	relation: EntityRelationType;
	cardinality?: RelationCardinality;
} & EntityRelationOptions;

/**
 * What a relation carries beyond its target, its kind and its number: which
 * attribute of the source it draws. See {@link EntityRelation.for}.
 */
export type EntityRelationOptions = {
	/** The attribute of the source this relation draws; see {@link EntityRelation.for}. */
	for?: string;
};

export class EntityRelation
	implements Visitable, SchemaConvertible<ods.EntityRelationSchema>
{
	source: Entity | ValueObject;
	target: Entity | ValueObject;
	label?: string;
	relation: EntityRelationType;
	cardinality?: RelationCardinality;
	/**
	 * The attribute of the source this relation draws, where the source uses
	 * one value object for more than one attribute: a customer's current
	 * address beside its address history. The label stays a phrase; this says
	 * which field the phrase is about, and `attribute-relation-coherence`
	 * pairs the two halves by it. Absent where the source uses the target
	 * once, which is the common case.
	 */
	for?: string;

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
		this.for = attributes.for;
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
			for: this.for,
		};
	}
}

/**
 * What can be named as making a consumption: one of the consumer's own
 * operations, or a policy or process of the consumer's context that issues
 * them.
 */
export type ConsumptionCaller = Consumable | Policy | Process;

/**
 * How a caller reads inside a consumption's ref: the collection it lives in,
 * then its id. Two callers of one consumer may share an id — an operation and
 * the policy named after it — and only the collection tells them apart.
 */
function callerSegment(caller: ConsumptionCaller): string {
	if (caller instanceof Policy) return `policies/${caller.id}`;
	if (caller instanceof Process) return `processes/${caller.id}`;
	return `provides/${caller.id}`;
}

export type ConsumptionAttributes = {
	pattern?: DownstreamRole;
	/**
	 * The consumer's own operations, or the policies and processes of its
	 * context, behind this exchange. Absent means the whole consumer
	 * (decision 21).
	 */
	by?: ConsumptionCaller[];
} & EvidenceOptions;

export class Consumption
	implements Visitable, Evidenced, SchemaConvertible<ods.ConsumptionSchema>
{
	consumer: Aggregate | Service;
	consumable: Consumable;
	pattern?: DownstreamRole;
	/** The consumer's own operations, policies or processes that make this exchange. */
	by: ConsumptionCaller[];
	comments: ods.Comment[];
	disposition?: ods.Disposition;

	/**
	 * A consumption has no id of its own, so its ref is derived from the pair
	 * it joins: the consumer's path, `consumes`, and the consumable's path
	 * with `/` replaced by `~`, the one ref-safe character no collection name
	 * or id contains. Deriving it from the pair rather than the position in
	 * `consumes[]` keeps it stable when the array is reordered, and flattening
	 * the whole consumable path rather than its ids alone keeps two providers
	 * of the same id — one aggregate, one service — apart.
	 *
	 * One consumer may take one consumable more than once when the exchanges
	 * differ, an archive taking a response as it stands beside a decision that
	 * translates it, so the pair alone does not always identify a consumption.
	 * Where it does not, the first caller named in `by` is appended as a
	 * further segment; `consumption-once` is what makes that caller present and
	 * the callers of the sibling consumptions disjoint, so the segment tells
	 * the two apart. A pair declared once keeps the ref it always had
	 * (decision 26, card 89).
	 *
	 * That segment names the caller's collection as well as its id, because an
	 * id is only unique within one. A context whose policy is named after the
	 * operation it issues — Petstore's "Reserve Pet" is both — gave two
	 * consumptions one ref while `consumption-once` saw two different callers
	 * and said nothing (card 95). `provides`, `policies` or `processes` is the
	 * same word the caller's own ref uses, so the two agree by construction.
	 */
	get path(): string {
		const pair = `${this.consumer.path}/consumes/${this.consumable.path.split("/").join("~")}`;
		const shared = this.consumer.consumptions.some(
			(other) => other !== this && other.consumable === this.consumable,
		);
		const caller = this.by[0];
		return shared && caller ? `${pair}/${callerSegment(caller)}` : pair;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

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
	/**
	 * What this attribute holds the identity of: an entity in any context, or
	 * a context itself when it is external or a big ball of mud, and the id
	 * belongs to a system whose entities are not ours to state or not anyone's
	 * to find (decisions 14 and 28).
	 */
	identifies?: Entity | BoundedContext;
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
	/**
	 * What this attribute holds the identity of: an entity in any context, or
	 * a context itself when it is external or a big ball of mud, and the id
	 * belongs to a system whose entities are not ours to state or not anyone's
	 * to find (decisions 14 and 28).
	 */
	identifies?: Entity | BoundedContext;
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
	 * send it as their payload, answer with it or refuse with it. All three are
	 * the same promise: removing an attribute breaks whoever is on the other
	 * end.
	 */
	get consumables(): Consumable[] {
		const out: Consumable[] = [];
		for (const bc of this.boundedcontext.workspace.boundedcontexts.values()) {
			for (const p of [...bc.aggregates.values(), ...bc.services.values()])
				for (const c of p.consumables.values())
					if (
						c.schema === this ||
						c.returns === this ||
						c.rejects.includes(this)
					)
						out.push(c);
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

/**
 * What a reaction waits for: an event, or the answer an operation comes back
 * with.
 *
 * The commonest process-manager shape is a call and a branch on what came
 * back, and a model that could wait only on events made its authors publish a
 * reply as a fact the world was told about: RiverMart published a declined
 * payment against decision 25's own example and NorthBank modelled one
 * synchronous verdict as two events. The answer is synchronous because the
 * operation is, so delivery is still implied by the consumable's type and
 * nothing new says it (decision 23, second amendment).
 *
 * An answer is named by its origin — `op.returned()`, `op.rejected(schema)`,
 * `op.completed()` — and never by the shape alone, so waiting on a refusal
 * wakes the reactor for that call and not for every other operation that
 * happens to refuse with the same schema (see {@link Answer}). A command that
 * returns nothing still comes back, and `op.completed()` is that: an answer
 * with no shape, which is all a caller of such a call ever learns.
 */
export type ReactionTrigger = Consumable | Answer;

/**
 * What a process waits for: everything a policy may wait for, and its own
 * deadlines.
 *
 * A deadline is the one trigger that belongs to the reactor rather than to
 * some provider, which is why only a process may name one: a policy is
 * stateless and remembers no instance, so it has no clock of its own to run
 * (decisions 15 and 23).
 */
export type ProcessTrigger = ReactionTrigger | Deadline;

export type PolicyAttributes = {
	description: string;
	/** The events or answers that trigger it; also settable with `.on(...)`. */
	on?: ReactionTrigger[];
	/** The operations it issues; also settable with `.issues(...)`. */
	issues?: Consumable[];
	id?: string;
};

/**
 * The schema field a policy or process writes its issued operations under.
 * Held indirectly so the object literals in `toSchema` below use a computed
 * key: written as `then:` they would be a synchronous, non-function `then`
 * property, which `noThenProperty` treats as a thenable regardless of what
 * it holds.
 */
const issuesSchemaKey = "then" as const;

/**
 * A reaction that lives in a bounded context: when any of the events it waits
 * for happens, or one of the answers it waits for comes back, it issues its
 * operation consumables. Either side may belong to another context.
 */
export class Policy implements Visitable, SchemaConvertible<ods.PolicySchema> {
	id: string;
	name: string;
	description: string;
	boundedcontext: BoundedContext;
	/** The events and answers that trigger the policy. */
	events: ReactionTrigger[] = [];
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
		this.on(...(attributes.on ?? []));
		this.issues(...(attributes.issues ?? []));
	}

	/** Adds a triggering event, or the answer an operation comes back with. */
	on(...events: ReactionTrigger[]): this {
		for (const event of events) {
			if (!this.events.includes(event)) this.events.push(event);
		}
		return this;
	}

	/** Adds an operation consumable to issue. */
	issues(...commands: Consumable[]): this {
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
			[issuesSchemaKey]: this.commands.map((it) => ({ $ref: it.ref })),
		};
	}
}

export type ProcessAttributes = {
	description: string;
	/**
	 * The events, or the own-context commands, that begin an instance; also
	 * settable with `.starts(...)`.
	 */
	starts?: Consumable[];
	/**
	 * The events, answers and deadlines it waits for while alive; also settable
	 * with `.on(...)`.
	 */
	on?: ProcessTrigger[];
	/** The operations it issues; also settable with `.issues(...)`. */
	issues?: Consumable[];
	/**
	 * The events, answers and deadlines that complete an instance; also
	 * settable with `.ends(...)`.
	 */
	ends?: ProcessTrigger[];
	id?: string;
} & EvidenceOptions;

export type DeadlineAttributes = {
	description: string;
	/**
	 * How long the instance waits before the deadline falls, in the words the
	 * business uses: "30 minutes", "two working days". Free text for the same
	 * reason an attribute's type is (decision 15): the model says the limit
	 * exists and how long it is, and leaves the arithmetic to the code.
	 */
	after: string;
	/**
	 * The trigger the interval counts from: one of the process's own `starts`
	 * or `on` entries. Absent means from the moment the instance began, which
	 * is the common case and stays unwritten. Also settable with
	 * `.countsFrom(...)`, which is how the loader sets it once the process's
	 * triggers are linked.
	 */
	from?: ProcessTrigger;
	id?: string;
};

/**
 * A time limit a process keeps on its own instances: cancel the reservation if
 * nobody has paid after thirty minutes.
 *
 * A deadline belongs to the process, not to a calendar. Decision 28's Clock is
 * an external context whose events every context shares — the month end, the
 * scheme cut-off — and a per-instance timer is not one of those: it starts
 * when this instance starts waiting, and nothing outside knows the instance
 * exists. Modelled as a Clock event it cost five declarations (an external
 * context, a service, an event, a consumption on a service that provides
 * nothing, and a relationship) to say one thing, and said the wrong thing
 * besides (decision 23, fourth amendment).
 *
 * So it is an element of the process, and the process is the only thing that
 * may name it: it may `on` a deadline, to act when the time is up, or `ends`
 * on one, when running out of time is how the instance finishes. It behaves as
 * an event the process raises to itself, and the reaction walk and the flow
 * map draw it that way — one step from the process back to the process,
 * labelled with how long the wait was and, where it is set, what it counts
 * from.
 *
 * The anchor is `from`: one of the process's own triggers, because a clock
 * starts on something the process has already heard. A statutory decision
 * window runs from the application's receipt rather than from whenever the
 * process happened to begin, and where the two differ the model said the wrong
 * thing until it could name the anchor (decision 23, fifth amendment).
 */
export class Deadline
	implements Referenceable, SchemaConvertible<ods.DeadlineSchema>
{
	id: string;
	name: string;
	description: string;
	/** How long the instance waits before it falls; see {@link DeadlineAttributes.after}. */
	after: string;
	/**
	 * The trigger the interval counts from, when it is not the start of the
	 * instance; see {@link DeadlineAttributes.from}.
	 */
	from?: ProcessTrigger;
	/** The process whose instances keep it. */
	process: Process;

	get path(): string {
		return `${this.process.path}/deadlines/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	/** The context the process belongs to, which is where the deadline is kept. */
	get boundedcontext(): BoundedContext {
		return this.process.boundedcontext;
	}

	constructor(process: Process, name: string, attributes: DeadlineAttributes) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.after = attributes.after;
		this.process = process;
		process.deadlines.set(this.id, this);
		if (attributes.from) this.countsFrom(attributes.from);
	}

	/**
	 * Sets what the interval counts from: a trigger the process already waits
	 * for, in `starts` or in `on`.
	 *
	 * Anything else is refused where it is written, as a foreign deadline is
	 * (see {@link Process}). A clock counts from a moment the instance can tell
	 * has arrived, and the only moments it knows are the ones it listens for;
	 * naming a fact the process never hears, or the deadline itself, is not a
	 * rule to report but a sentence with nothing behind it. An ending trigger
	 * is refused for the same reason: the instance is over, so no clock of its
	 * own starts there.
	 */
	countsFrom(trigger: ProcessTrigger): this {
		if (trigger === this)
			throw new Error(
				`Deadline ${this.name} cannot count from itself; a clock starts on something that happened before it`,
			);
		const waitsFor = [
			...this.process.startEvents,
			...this.process.events,
		].includes(trigger);
		if (!waitsFor)
			throw new Error(
				`Deadline ${this.name} counts from ${trigger.name}, which process ${this.process.name} does not wait for; a deadline counts from one of the process's own starts or on triggers`,
			);
		this.from = trigger;
		return this;
	}

	toSchema(): ods.DeadlineSchema {
		return {
			name: this.name,
			description: this.description,
			after: this.after,
			from: this.from && { $ref: this.from.ref },
		};
	}
}

/**
 * A reaction that outlives one event. A policy is stateless and any-of: it
 * fires whenever one of its events happens. A process remembers — which of
 * its events have arrived, what it has already issued — so it can wait for
 * two facts before acting and can say how an instance finishes.
 *
 * `starts` begins an instance, `on` are the further facts it waits for,
 * `issues` are the operations of its own context it issues, and `ends` are the
 * facts that complete it. What it correlates on, how long it waits and what
 * it compensates are prose in the description: the model states that the
 * process exists and what it listens to and does, and leaves how it decides
 * to the code (decision 23).
 *
 * What it waits for and what completes it may be an answer as well as an
 * event, because the commonest process is a call and a branch on what came
 * back (see {@link ReactionTrigger}). It may also be one of the process's own
 * deadlines, because the second commonest is a wait with a time limit on it
 * (see {@link Deadline}). What starts one is an event or a command of this
 * process's own context — "open a claim" starts a saga as surely as a claim
 * being opened does. An answer and a deadline start nothing: a caller has to
 * have made the call to get an answer, and a deadline is counted from the
 * moment an instance began waiting, so in both cases something was already
 * there, and an instance that did not exist before cannot have been.
 */
export class Process
	implements Visitable, Evidenced, SchemaConvertible<ods.ProcessSchema>
{
	id: string;
	name: string;
	description: string;
	boundedcontext: BoundedContext;
	/** The events and own-context commands that begin an instance. */
	startEvents: Consumable[] = [];
	/** The events, answers and deadlines an instance waits for while it is alive. */
	events: ProcessTrigger[] = [];
	/** Operation consumables the process issues. */
	commands: Consumable[] = [];
	/** The events, answers and deadlines that complete an instance. */
	endEvents: ProcessTrigger[] = [];
	/** The time limits this process keeps on its own instances, by id. */
	deadlines = new Map<string, Deadline>();
	comments: ods.Comment[];
	disposition?: ods.Disposition;

	get path(): string {
		return `${this.boundedcontext.path}/processes/${this.id}`;
	}

	get ref(): string {
		return `#/${this.path}`;
	}

	constructor(
		boundedcontext: BoundedContext,
		name: string,
		attributes: ProcessAttributes,
	) {
		this.id = attributes.id || snakeCase(name);
		this.name = name;
		this.description = attributes.description;
		this.boundedcontext = boundedcontext;
		this.comments = attributes.comments ?? [];
		this.disposition = normaliseDisposition(attributes.disposition);
		this.boundedcontext.processes.set(this.id, this);
		this.starts(...(attributes.starts ?? []));
		this.on(...(attributes.on ?? []));
		this.issues(...(attributes.issues ?? []));
		this.ends(...(attributes.ends ?? []));
	}

	/**
	 * Adds something that begins an instance: an event, or an operation of this
	 * process's own context — the command that creates one. A foreign
	 * operation is `process-in-context`'s to report, as a foreign command in
	 * `issues` is.
	 */
	starts(...events: Consumable[]): this {
		return this.add(this.startEvents, events);
	}

	/**
	 * Adds an event an instance waits for while it is alive, an answer it waits
	 * to come back, or one of its own deadlines.
	 */
	on(...events: ProcessTrigger[]): this {
		for (const event of events) this.refuseForeignDeadline(event);
		return this.add(this.events, events);
	}

	/** Adds an operation consumable to issue. */
	issues(...commands: Consumable[]): this {
		return this.add(this.commands, commands);
	}

	/** Adds an event, an answer, or a deadline that completes an instance. */
	ends(...events: ProcessTrigger[]): this {
		for (const event of events) this.refuseForeignDeadline(event);
		return this.add(this.endEvents, events);
	}

	/**
	 * Refuses a deadline that belongs to another process. A deadline counts
	 * from the moment one instance began waiting, so no other reactor knows
	 * the instance exists, let alone when its clock started; naming somebody
	 * else's is not a rule to report but a sentence with no meaning, and it is
	 * refused where it is written, as an answer of an operation that returns
	 * nothing is.
	 */
	private refuseForeignDeadline(trigger: ProcessTrigger): void {
		if (trigger instanceof Deadline && trigger.process !== this)
			throw new Error(
				`Deadline ${trigger.name} belongs to process ${trigger.process.name}, so ${this.name} cannot wait on it`,
			);
	}

	/**
	 * Declares a time limit this process keeps on its own instances. Name it
	 * before naming it in `on` or `ends`, the way an operation exists before a
	 * process issues it.
	 */
	addDeadline(name: string, attributes: DeadlineAttributes): Deadline {
		return new Deadline(this, name, attributes);
	}

	private add<T extends ProcessTrigger>(target: T[], consumables: T[]): this {
		for (const consumable of consumables) {
			if (!target.includes(consumable)) target.push(consumable);
		}
		return this;
	}

	accept(v: Visitor) {
		return v.visitProcess(this);
	}

	toSchema(): ods.ProcessSchema {
		const refs = (triggers: ProcessTrigger[]) =>
			triggers.map((it) => ({ $ref: it.ref }));
		return {
			name: this.name,
			description: this.description,
			// Deadlines come before the lists, because `on` and `ends` may name
			// one and a reader meets it where it is declared.
			deadlines: this.deadlines.size
				? Object.fromEntries(
						[...this.deadlines].map(([id, it]) => [id, it.toSchema()]),
					)
				: undefined,
			starts: refs(this.startEvents),
			on: refs(this.events),
			[issuesSchemaKey]: refs(this.commands),
			ends: refs(this.endEvents),
			comments: this.comments.length ? this.comments : undefined,
			disposition: this.disposition,
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
