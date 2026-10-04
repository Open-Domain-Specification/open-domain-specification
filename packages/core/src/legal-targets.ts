import { mayBorrowFrom, sharesKernelWith } from "./borrowing";
import type { SetPath } from "./path-codec";
import { hearsAnswerOf } from "./reaction-walk";
import { deadlineAnchor, processTrigger, REF_KINDS } from "./ref-kinds";
import {
	type InvariantShape,
	mayCarrySchemaFrom,
	mayConstrain,
	mayIdentify,
	mayRelate,
	startingCommands,
} from "./validate";
import {
	Aggregate,
	Answer,
	Attribute,
	BoundedContext,
	type Constrainable,
	Consumable,
	Consumption,
	ContextRelationship,
	constrainableLabel,
	DataSchema,
	Deadline,
	Domain,
	Entity,
	EntityRelation,
	GlossaryTerm,
	Invariant,
	isDirectedRelationshipType,
	Policy,
	Process,
	Service,
	Subdomain,
	Team,
	ValueObject,
	type Workspace,
	workspaceOf,
} from "./workspace";
import {
	identityKeyOf,
	type RefKind,
	type WorkspaceSet,
} from "./workspace-set";

/**
 * Which element a reference field may name, asked of a workspace set that is
 * already loaded.
 *
 * Every question here is about one field of one element: "may this holder name
 * that target?". The answers are the model's own, read from the predicates the
 * validator's rules call (`mayBorrowFrom`, `mayCarrySchemaFrom`, `mayIdentify`,
 * `mayRelate`, `mayConstrain`, `hearsAnswerOf`) or, for the few classes the
 * rules state only inline, from the same conditions in the same words. Nothing
 * here runs a rule or reads a diagnostic, so it can be asked of any loaded set,
 * before a change and again after it, for an element that already exists
 * (decision 08: a file boundary grants nothing and removes nothing; every
 * loaded file is one model).
 *
 * What is not asked is whether a structure is complete. A policy with nothing
 * to issue, a process with no end or an aggregate with no root are
 * incompleteness the validator reports, not choices that are wrong; and a
 * choice that is only legal beside another field of the same holder (a
 * precondition's operations, a relation's type) is judged against the value of
 * that other field the caller gives in the holder.
 */

/** The twenty fields that hold a `$ref`, by what each one may name. */
export type LegalClassId =
	| "LC-TEAM"
	| "LC-SUBDOMAIN"
	| "LC-CONTEXT"
	| "LC-OWN-AGGREGATE-ENTITY"
	| "LC-VALUE-OBJECT-BORROWABLE"
	| "LC-SCHEMA-ATTRIBUTE"
	| "LC-SCHEMA-CARRY"
	| "LC-IDENTITY-TARGET"
	| "LC-RELATION-TARGET"
	| "LC-CONSTRAINS"
	| "LC-TERM-EMBODIES"
	| "LC-RAISES"
	| "LC-CONSUMED"
	| "LC-BY"
	| "LC-AGREEMENT"
	| "LC-POLICY-ON"
	| "LC-OPERATION-OWN-CONTEXT"
	| "LC-PROCESS-STARTS"
	| "LC-PROCESS-TRIGGER"
	| "LC-DEADLINE-FROM";

/**
 * The two fields that hold a value rather than a `$ref`. A relation's `for`
 * is one of its source's attribute names ({@link relationForChoices}); a
 * context's system kind is one of four, and only a context that already holds
 * insides is refused some of them ({@link systemKindProblem}).
 */
export type ValueRuleId = "LC-RELATION-FOR" | "LC-BC-FLAGS";

/**
 * The facts about the element whose field is being filled that decide which
 * targets are legal. Every member is optional: a class reads the ones it
 * needs and refuses, naming what is missing, when one of them is absent.
 *
 * Present for an element that exists ({@link holderOf}, which works on any
 * loaded set) and synthesised from its parent for one that does not yet
 * ({@link holderForNew}).
 */
export interface LegalHolder {
	/** The context the holder sits in; for a relationship end, the other end already chosen. */
	context?: BoundedContext;
	aggregate?: Aggregate;
	/** The aggregate or service that provides or consumes. */
	provider?: Aggregate | Service;
	process?: Process;
	/** The entity, value object or schema holding the attribute or relation. */
	attributeOwner?: Entity | ValueObject | DataSchema;
	/** The invariant's owner, timing and chosen guards, from the draft or the element. */
	invariant?: InvariantShape;
	/** The operation that raises, the one a consumption takes, or the one a schema is carried on. */
	consumable?: Consumable;
	/** The relation type chosen beside the target. */
	relation?: EntityRelationKind;
	/**
	 * The attribute's other typing field, as it will be saved: the value object
	 * beside a schema being chosen, the schema beside a value object. A form
	 * that clears the sibling in the same edit passes it cleared.
	 */
	attribute?: { valueobject?: ValueObject; schema?: DataSchema };
	/** Whether the entity is, as it will be saved, marked the root of its aggregate. */
	root?: boolean;
	/** The existing holder itself; excluded from its own candidates where a class says so. Absent on add. */
	self?: object;
}

type EntityRelationKind = EntityRelation["relation"];

/** One element a field may name, in the file it is in. */
export interface Candidate {
	element: object;
	/** {@link identityKeyOf}: the file and pointer, so two files' equal local ids stay apart. */
	key: string;
	/** What it is, in words: "entity", "event", "value object". */
	kind: string;
	name: string;
	/** The containers between its context and it, outermost first; the context itself is not in it. */
	path: string[];
	file: SetPath;
}

export type Verdict =
	| { ok: true }
	| { ok: false; rule: string; reason: string };

/** The four things a context can be, of which a context is exactly one. */
export type SystemKind =
	| "modelled"
	| "external"
	| "bigBallOfMud"
	| "boundaryOnly";

const OK: Verdict = { ok: true };

function refuse(rule: string, reason: string): Verdict {
	return { ok: false, rule, reason };
}

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

/** The word a person reads for the kind of any element. */
export function kindWord(it: object): string {
	if (it instanceof Consumable) return it.type;
	if (it instanceof Answer) return "answer";
	if (it instanceof Entity) return "entity";
	if (it instanceof ValueObject) return "value object";
	if (it instanceof DataSchema) return "schema";
	if (it instanceof Attribute) return "attribute";
	if (it instanceof BoundedContext) return "bounded context";
	if (it instanceof Aggregate) return "aggregate";
	if (it instanceof Service) return `${it.type} service`;
	if (it instanceof Invariant) return "invariant";
	if (it instanceof Policy) return "policy";
	if (it instanceof Process) return "process";
	if (it instanceof Deadline) return "deadline";
	if (it instanceof Team) return "team";
	if (it instanceof Subdomain) return "subdomain";
	if (it instanceof Domain) return "domain";
	if (it instanceof GlossaryTerm) return "term";
	if (it instanceof ContextRelationship) return "relationship";
	if (it instanceof Consumption) return "consumption";
	return "element";
}

/** A name a person can read for any element, relationship and consumption included. */
export function nameOf(it: object): string {
	if (it instanceof ContextRelationship)
		return `${it.name ?? it.type}: ${it.source.name} and ${it.target.name}`;
	if (it instanceof Consumption)
		return `${it.consumer.name} consumes ${it.consumable.name}`;
	return (it as { name?: string }).name ?? "";
}

function label(it: object): string {
	return `${kindWord(it)} "${nameOf(it)}"`;
}

function pathOf(it: object): string[] {
	if (it instanceof Entity) return [it.aggregate.name];
	if (it instanceof Attribute) return [...pathOf(it.owner), it.owner.name];
	if (it instanceof Consumable) return [it.provider.name];
	if (it instanceof Answer)
		return [it.operation.provider.name, it.operation.name];
	if (it instanceof Deadline) return [it.process.name];
	if (it instanceof Subdomain) return [it.domain.name];
	if (it instanceof Invariant) return [it.owner.name];
	if (it instanceof Consumption) return [it.consumer.name];
	return [];
}

function candidateOf(element: object): Candidate {
	const owner = workspaceOf(element) as Workspace;
	return {
		element,
		key: identityKeyOf(element as { ref: string }),
		kind: kindWord(element),
		name: nameOf(element),
		path: pathOf(element),
		file: owner.file as SetPath,
	};
}

// ---------------------------------------------------------------------------
// Holders
// ---------------------------------------------------------------------------

/** The workspace an element sits in, whatever it is (a relation sits where its source does). */
function homeOf(element: object): Workspace | undefined {
	return element instanceof EntityRelation
		? workspaceOf(element.source)
		: workspaceOf(element);
}

/**
 * The holder facts of an element that already exists in `set`, for asking what
 * its fields may name. Works on any loaded set and needs no validation, so the
 * same element found in a set read before a change and in one read after it
 * can be asked the same question. An element that is not in `set` is a
 * mistake of the caller and throws, as {@link WorkspaceSet.refTo} does.
 */
export function holderOf(set: WorkspaceSet, element: object): LegalHolder {
	const home = homeOf(element);
	if (home?.set !== set)
		throw new Error(`${nameOf(element)} is not an element of this set`);
	return { ...factsOf(element), self: element };
}

function factsOf(element: object): LegalHolder {
	if (element instanceof BoundedContext) return { context: element };
	if (element instanceof Aggregate)
		return {
			context: element.boundedcontext,
			aggregate: element,
			provider: element,
		};
	if (element instanceof Service)
		return { context: element.boundedcontext, provider: element };
	if (element instanceof Entity)
		return {
			context: element.boundedcontext,
			aggregate: element.aggregate,
			attributeOwner: element,
			root: element.root,
		};
	if (element instanceof ValueObject || element instanceof DataSchema)
		return { context: element.boundedcontext, attributeOwner: element };
	if (element instanceof Attribute) {
		const owner = element.owner as Entity | ValueObject | DataSchema;
		return {
			...factsOf(owner),
			attribute: { valueobject: element.valueobject, schema: element.schema },
		};
	}
	if (element instanceof EntityRelation)
		return { ...factsOf(element.source), relation: element.relation };
	if (element instanceof Invariant)
		return {
			context: element.boundedcontext,
			aggregate: element.owner instanceof Aggregate ? element.owner : undefined,
			invariant: element,
		};
	if (element instanceof Consumable)
		return {
			...factsOf(element.provider),
			consumable: element,
		};
	if (element instanceof Consumption)
		return {
			...factsOf(element.consumer),
			consumable: element.consumable,
		};
	if (element instanceof Process)
		return { context: element.boundedcontext, process: element };
	if (element instanceof Deadline)
		return { context: element.boundedcontext, process: element.process };
	if (element instanceof Policy || element instanceof GlossaryTerm)
		return { context: element.boundedcontext };
	// A relationship's ends are judged through `self` (see LC-CONTEXT), which
	// holderOf supplies; a team, domain or subdomain holds no reference that
	// depends on its surroundings.
	return {};
}

/**
 * The holder facts for a `family` element about to be added under `parent`:
 * the parent's facts, no `self`, and whatever the form has chosen so far in
 * `draft` (a relation's type, an invariant's timing and guards, the operation
 * a consumption takes).
 */
export function holderForNew(
	set: WorkspaceSet,
	parent: object,
	family: string,
	draft: Partial<LegalHolder> = {},
): LegalHolder {
	const { self: _self, ...facts } = holderOf(set, parent);
	const inherited: LegalHolder =
		family === "invariant" &&
		(parent instanceof Aggregate ||
			parent instanceof BoundedContext ||
			parent instanceof ValueObject)
			? {
					invariant: {
						owner: parent,
						precondition: false,
						postcondition: false,
						guarded: [],
					},
				}
			: {};
	return { ...facts, ...inherited, ...draft, self: undefined };
}

/** The context a holder sits in, by whichever of its facts says so. */
function contextOfHolder(holder: LegalHolder): BoundedContext | undefined {
	const owner = holder.invariant?.owner;
	return (
		holder.context ??
		holder.provider?.boundedcontext ??
		holder.consumable?.boundedcontext ??
		holder.process?.boundedcontext ??
		holder.attributeOwner?.boundedcontext ??
		(owner instanceof BoundedContext ? owner : owner?.boundedcontext)
	);
}

/**
 * Whether two different contexts have declared they do not integrate
 * (`separate-ways`), read from the set as it is now.
 */
function declaredApart(
	set: WorkspaceSet,
	one: BoundedContext,
	other: BoundedContext,
): boolean {
	return (
		one !== other &&
		set.scope.relationships.some(
			(r) => r.type === "separate-ways" && r.involves(one) && r.involves(other),
		)
	);
}

/** The refusal for taking in another context's consumable across separate ways. */
function apartProblem(
	set: WorkspaceSet,
	here: BoundedContext,
	consumable: Consumable,
): Verdict {
	const owner = consumable.boundedcontext;
	return declaredApart(set, here, owner)
		? refuse(
				"separate-ways",
				`${label(consumable)} belongs to "${owner.name}", which "${here.name}" declares separate ways with; contexts that do not integrate neither consume nor react to each other`,
			)
		: OK;
}

/** The policy or process whose triggers are being filled. */
function reactorOf(holder: LegalHolder): Policy | Process | undefined {
	if (holder.process) return holder.process;
	return holder.self instanceof Policy ? holder.self : undefined;
}

// ---------------------------------------------------------------------------
// The universe of a field's kind
// ---------------------------------------------------------------------------

/**
 * Every element of every file of the set that any field names, files in the
 * order the set holds them and elements in declaration order. Answers are the
 * ones the operations declare; a relationship and a consumption are included
 * because two fields name them.
 */
function* elementsOf(set: WorkspaceSet): Iterable<object> {
	for (const workspace of set.workspaces) {
		yield* workspace.teams.values();
		for (const domain of workspace.domains.values()) {
			yield domain;
			yield* domain.subdomains.values();
		}
		yield* workspace.relationships;
		for (const context of workspace.boundedcontexts.values()) {
			yield context;
			for (const schema of context.schemas.values()) {
				yield schema;
				yield* schema.attributes.values();
			}
			for (const value of context.valueobjects.values()) {
				yield value;
				yield* value.attributes.values();
				yield* value.invariants.values();
			}
			for (const aggregate of context.aggregates.values()) {
				yield aggregate;
				for (const entity of aggregate.entities.values()) {
					yield entity;
					yield* entity.attributes.values();
				}
				yield* aggregate.invariants.values();
				yield* providedBy(aggregate);
			}
			for (const service of context.services.values()) {
				yield service;
				yield* providedBy(service);
			}
			yield* context.invariants.values();
			yield* context.policies.values();
			for (const process of context.processes.values()) {
				yield process;
				yield* process.deadlines.values();
			}
			yield* context.glossary.values();
		}
	}
}

function* providedBy(provider: Aggregate | Service): Iterable<object> {
	for (const consumable of provider.consumables.values()) {
		yield consumable;
		yield* consumable.answers;
	}
	yield* provider.consumptions;
}

/** Whether a term's embodiment can be written down: only named elements are pointed at. */
function isNamed(it: object): boolean {
	return typeof (it as { name?: unknown }).name === "string";
}

// ---------------------------------------------------------------------------
// The classes
// ---------------------------------------------------------------------------

type Question = {
	set: WorkspaceSet;
	holder: LegalHolder;
	target: object;
};

type ClassDefinition = {
	/** What the field is written to name, by the same kind the loader reads it with. */
	kind(holder: LegalHolder): RefKind<object> | undefined;
	legal(question: Question): Verdict;
};

/** The verdict for a question whose holder lacks a fact the class needs. */
function missing(what: string): Verdict {
	return refuse("holder-incomplete", `choose ${what} first`);
}

const CLASSES: Record<LegalClassId, ClassDefinition> = {
	"LC-TEAM": { kind: () => REF_KINDS.team, legal: () => OK },
	"LC-SUBDOMAIN": { kind: () => REF_KINDS.subdomain, legal: () => OK },

	"LC-CONTEXT": {
		kind: () => REF_KINDS.context,
		legal({ holder, target }) {
			if (holder.context && target === holder.context)
				return refuse(
					"relationship-ends",
					`${label(target)} is already the other end; a relationship joins two different contexts`,
				);
			// A relationship read from a set (the writer's post-write one) has both
			// ends: the other end of the one being judged is then a fact of the
			// element itself, so a relationship that joins a context to itself
			// refuses that context whichever end is asked about.
			const joined = holder.self;
			if (
				joined instanceof ContextRelationship &&
				joined.source === joined.target &&
				target === joined.source
			)
				return refuse(
					"relationship-ends",
					`${label(target)} is both ends of the relationship; a relationship joins two different contexts`,
				);
			return OK;
		},
	},

	"LC-OWN-AGGREGATE-ENTITY": {
		kind: () => REF_KINDS.entity,
		legal({ holder, target }) {
			if (!holder.aggregate) return missing("the aggregate");
			const entity = target as Entity;
			if (holder.root)
				return refuse(
					"specialisation-not-root",
					`the entity is marked the root of aggregate "${holder.aggregate.name}"; an aggregate has one root, and a kind of an entity is reached through that root, so the root is not a kind of anything`,
				);
			if (entity.aggregate !== holder.aggregate)
				return refuse(
					"specialisation-in-boundary",
					`${label(entity)} is in aggregate "${entity.aggregate.name}"; an entity is a kind of an entity of its own aggregate "${holder.aggregate.name}", since both are saved through the same root`,
				);
			if (isKindOfSelf(entity, holder.self))
				return refuse(
					"specialisation-cycle",
					`${label(entity)} is already ${entity === holder.self ? "the entity itself" : "a kind of it"}; a chain of kinds ends at the thing every one of them is, so nothing is a kind of itself`,
				);
			return OK;
		},
	},

	"LC-VALUE-OBJECT-BORROWABLE": {
		kind: () => REF_KINDS.valueObject,
		legal({ set, holder, target }) {
			const context = contextOfHolder(holder);
			if (!context) return missing("the context holding it");
			const value = target as ValueObject;
			if (holder.attribute?.schema)
				return refuse(
					"attribute-one-shape",
					`the attribute already names schema "${holder.attribute.schema.name}"; an attribute has one shape, so choose a value object or a schema, not both`,
				);
			if (isKindOfSelf(value, holder.self))
				return refuse(
					"specialisation-cycle",
					`${label(value)} is already ${value === holder.self ? "the value object itself" : "a kind of it"}; a chain of kinds ends at the thing every one of them is, so nothing is a kind of itself`,
				);
			if (
				value.boundedcontext === context ||
				mayBorrowFrom(set.scope, context, value.boundedcontext)
			)
				return OK;
			return refuse(
				"valueobject-context",
				`${label(value)} belongs to "${value.boundedcontext.name}", which "${context.name}" neither shares a kernel with, conforms to, nor is the customer of; a value object is part of one context's language and is borrowed only through one of those three declarations`,
			);
		},
	},

	"LC-SCHEMA-ATTRIBUTE": {
		kind: () => REF_KINDS.schema,
		legal({ set, holder, target }) {
			const owner = holder.attributeOwner;
			if (!owner)
				return missing(
					"the schema, entity or value object holding the attribute",
				);
			const schema = target as DataSchema;
			if (!(owner instanceof DataSchema))
				return refuse(
					"attribute-one-shape",
					`${label(owner)} is not a schema; an entity or value object names a value object, and only a schema's attribute names a schema`,
				);
			const context = owner.boundedcontext;
			if (holder.attribute?.valueobject)
				return refuse(
					"attribute-one-shape",
					`the attribute already names value object "${holder.attribute.valueobject.name}"; an attribute has one shape, so choose a schema or a value object, not both`,
				);
			if (
				schema.boundedcontext === context ||
				mayBorrowFrom(set.scope, context, schema.boundedcontext)
			)
				return OK;
			return refuse(
				"schema-context",
				`${label(schema)} belongs to "${schema.boundedcontext.name}", which "${context.name}" neither shares a kernel with, conforms to, nor is the customer of; a payload belongs to the context that publishes it`,
			);
		},
	},

	"LC-SCHEMA-CARRY": {
		kind: () => REF_KINDS.schema,
		legal({ set, holder, target }) {
			const carrier =
				holder.consumable?.boundedcontext ?? contextOfHolder(holder);
			if (!carrier) return missing("the operation or event that carries it");
			const schema = target as DataSchema;
			if (schema.boundedcontext === carrier) return OK;
			// Where the operation does not exist yet there is no layer to read, so
			// only what borrowing allows is offered.
			const allowed = holder.consumable
				? mayCarrySchemaFrom(
						set.scope,
						carrier,
						schema.boundedcontext,
						holder.consumable,
					)
				: mayBorrowFrom(set.scope, carrier, schema.boundedcontext);
			if (allowed) return OK;
			return refuse(
				"schema-context",
				`${label(schema)} belongs to "${schema.boundedcontext.name}", which "${carrier.name}" neither shares a kernel with, conforms to, nor is the customer of, and no anti-corruption layer toward it translates this call; a payload belongs to the context that publishes it`,
			);
		},
	},

	"LC-IDENTITY-TARGET": {
		kind: () => REF_KINDS.identityTarget,
		legal({ set, target }) {
			const identity = target as Entity | BoundedContext | DataSchema;
			if (mayIdentify(set.scope, identity)) return OK;
			if (identity instanceof BoundedContext)
				return refuse(
					"identifies-entity",
					`${label(identity)} states its insides; an identity names its entity, and only a context that is external, a big ball of mud or modelled at its boundary only is named as a whole`,
				);
			if (identity instanceof DataSchema)
				return refuse(
					"identifies-entity",
					`${label(identity)} is published by "${identity.boundedcontext.name}", which states its insides; a published schema stands for an id only where the context is external or modelled at its boundary only, so name the entity instead`,
				);
			return refuse(
				"identifies-entity",
				`${label(identity)} is not an entity of a file in this set`,
			);
		},
	},

	"LC-RELATION-TARGET": {
		kind: () => REF_KINDS.relationTarget,
		legal({ set, holder, target }) {
			const source = holder.attributeOwner;
			if (!(source instanceof Entity || source instanceof ValueObject))
				return missing("the entity or value object that holds the relation");
			if (!holder.relation) return missing("what the relation says");
			const end = target as Entity | ValueObject;
			if (
				mayRelate(set.scope, { source, relation: holder.relation, target: end })
			)
				return OK;
			return refuse(...relationProblem(source, holder.relation, end));
		},
	},

	"LC-CONSTRAINS": {
		kind: () => REF_KINDS.constrainable,
		legal({ set, holder, target }) {
			const invariant = holder.invariant;
			if (!invariant) return missing("the invariant and its owner");
			const reached = target as Constrainable;
			if (mayConstrain(set.scope, invariant, reached)) return OK;
			const owner = invariant.owner;
			const [rule, kind] =
				owner instanceof ValueObject
					? ["invariant-in-value-object", "value object"]
					: owner instanceof Aggregate
						? ["invariant-in-aggregate", "aggregate"]
						: ["invariant-in-context", "bounded context"];
			return refuse(
				rule,
				`${kindWord(reached)} "${constrainableLabel(reached)}" is outside what the ${kind} "${owner.name}" can keep true; a rule reaches only what is inside its own boundary, and a precondition or postcondition also the shapes of the operation it guards`,
			);
		},
	},

	"LC-TERM-EMBODIES": {
		kind: () => REF_KINDS.element,
		legal({ holder, target }) {
			const context = holder.context;
			if (!context) return missing("the context the term belongs to");
			const element = target as { ref: string };
			if (!isNamed(target))
				return refuse(
					"term-in-context",
					`${label(target)} has no name of its own to be embodied by`,
				);
			if (
				workspaceOf(target) === context.workspace &&
				(element.ref === context.ref ||
					element.ref.startsWith(`${context.ref}/`))
			)
				return OK;
			return refuse(
				"term-in-context",
				`${label(target)} is not part of "${context.name}"; a term belongs to the language of one context, and the same word means something else next door`,
			);
		},
	},

	"LC-RAISES": {
		kind: () => REF_KINDS.consumable,
		legal({ holder, target }) {
			const provider = holder.provider ?? holder.consumable?.provider;
			if (!provider)
				return missing("the aggregate or service that provides the operation");
			const event = target as Consumable;
			const context = provider.boundedcontext;
			if (event.type !== "event")
				return refuse(
					"consumable-kind",
					`${label(event)} is an operation; only operations raise events, and what they raise is an event`,
				);
			if (event.boundedcontext !== context)
				return refuse(
					"raises-in-context",
					`${label(event)} belongs to "${event.boundedcontext.name}"; a context publishes its own facts, so "${context.name}" cannot raise another context's event`,
				);
			const inside =
				provider instanceof Aggregate || provider.type === "domain";
			if (inside && !context.external && event.provider !== provider)
				return refuse(
					"raises-in-aggregate",
					`${label(event)} belongs to "${event.provider.name}", not to "${provider.name}"; each aggregate is saved in its own transaction, so "${provider.name}" making another's fact true spans two of them. Let "${event.provider.name}" raise its own event, and let an application service front both`,
				);
			return OK;
		},
	},

	"LC-CONSUMED": {
		kind: () => REF_KINDS.consumable,
		legal({ set, holder, target }) {
			const consumer = holder.provider;
			if (!consumer) return missing("the aggregate or service that consumes");
			const consumable = target as Consumable;
			const here = consumer.boundedcontext;
			const owner = consumable.boundedcontext;
			if (owner !== here && consumable.internal)
				return refuse(
					"internal-consumable",
					`${label(consumable)} is internal to "${owner.name}", so nothing outside it consumes it`,
				);
			const apart = apartProblem(set, here, consumable);
			if (!apart.ok) return apart;
			if (consumer instanceof Aggregate) {
				if (owner !== here)
					return refuse(
						"aggregate-consumes-inside",
						`${label(consumable)} belongs to "${owner.name}"; an aggregate is a consistency boundary, not a client, so let ${consumable.type === "event" ? `a policy of "${here.name}" react to it and issue an operation of "${here.name}"` : `an application service of "${here.name}" make the call`}`,
					);
				if (
					consumable.type === "operation" &&
					consumable.provider instanceof Aggregate &&
					consumable.provider !== consumer
				)
					return refuse(
						"aggregate-consumes-inside",
						`${label(consumable)} is an operation of aggregate "${consumable.provider.name}"; each aggregate is saved in its own transaction, so one calling the other spans two of them. Let a service of "${here.name}" front the call`,
					);
				return OK;
			}
			if (consumer.type === "domain" && owner !== here)
				return refuse(
					"domain-service-consumes-inside",
					`${label(consumable)} belongs to "${owner.name}"; a domain service is the inside of the model, not a client, so let an application service of "${here.name}" take it in`,
				);
			if (
				owner !== here &&
				consumable.type === "operation" &&
				!owner.external
			) {
				const provider = consumable.provider;
				if (provider instanceof Aggregate) {
					if (!sharesKernelWith(set.scope, owner, here))
						return refuse(
							"aggregate-not-public",
							`${label(consumable)} is an operation of aggregate "${provider.name}", internal to "${owner.name}"; another context reaches an aggregate's operation only across a shared kernel`,
						);
				} else if (provider.type === "domain")
					return refuse(
						"domain-service-internal",
						`${label(consumable)} is an operation of domain service "${provider.name}", internal to "${owner.name}"; what a context offers outward is provided by an application service`,
					);
			}
			return OK;
		},
	},

	"LC-BY": {
		kind: () => REF_KINDS.caller,
		legal({ holder, target }) {
			const consumer = holder.provider;
			if (!consumer) return missing("the aggregate or service that consumes");
			const consumed = holder.consumable;
			if (!consumed) return missing("what is consumed");
			if (target instanceof Consumable) {
				if (target.provider !== consumer)
					return refuse(
						"consumption-by-resolves",
						`${label(target)} is provided by "${target.provider.name}"; a consumption names the consumer's own operations`,
					);
				if (target.type !== "operation")
					return refuse(
						"consumption-by-resolves",
						`${label(target)} is an event; an event is something that has happened, so it calls nothing`,
					);
				if (consumed.type !== "operation")
					return refuse(
						"consumption-by-reactor",
						`${label(consumed)} is a subscription, and an operation is issued rather than woken; name the policy or the process of "${consumer.boundedcontext.name}" that reacts to it`,
					);
				return OK;
			}
			const reactor = target as Policy | Process;
			if (reactor.boundedcontext !== consumer.boundedcontext)
				return refuse(
					"consumption-by-resolves",
					`${label(reactor)} belongs to "${reactor.boundedcontext.name}"; a consumption names the policies and processes of the consumer's own context`,
				);
			if (consumed.type === "operation")
				return refuse(
					"consumption-by-operation",
					`${label(consumed)} is a call; a ${kindWord(reactor)} issues an operation of its own context and that operation makes the call, so name that operation`,
				);
			return OK;
		},
	},

	"LC-AGREEMENT": {
		kind: () => REF_KINDS.relationship,
		legal({ holder, target }) {
			const consumer = holder.provider;
			if (!consumer) return missing("the aggregate or service that consumes");
			const consumed = holder.consumable;
			if (!consumed) return missing("what is consumed");
			const agreement = target as ContextRelationship;
			const provides = consumed.boundedcontext;
			const takes = consumer.boundedcontext;
			if (provides === takes)
				return refuse(
					"consumption-agreement",
					`${label(consumed)} stays inside "${takes.name}"; an exchange belongs to an agreement between the two contexts it crosses`,
				);
			if (
				isDirectedRelationshipType(agreement.type) &&
				agreement.involves(provides) &&
				agreement.involves(takes)
			)
				return OK;
			return refuse(
				"consumption-agreement",
				`${label(agreement)} does not join "${provides.name}" and "${takes.name}" as a directed agreement; an exchange belongs to an agreement between the two contexts it crosses`,
			);
		},
	},

	"LC-POLICY-ON": {
		kind: () => REF_KINDS.reactionTrigger,
		legal: ({ set, holder, target }) =>
			triggerProblem(set, holder, target, reactorOf(holder)),
	},

	"LC-OPERATION-OWN-CONTEXT": {
		kind: () => REF_KINDS.consumable,
		legal({ holder, target }) {
			const context = contextOfHolder(holder);
			if (!context) return missing("the context of the policy or process");
			const operation = target as Consumable;
			if (operation.type !== "operation")
				return refuse(
					"consumable-kind",
					`${label(operation)} is an event; a policy or process issues operations`,
				);
			if (operation.boundedcontext !== context)
				return refuse(
					holder.process || holder.self instanceof Process
						? "process-in-context"
						: "policy-in-context",
					`${label(operation)} belongs to "${operation.boundedcontext.name}"; acting inside another context is that context's own to do, so name an operation of "${context.name}"`,
				);
			return OK;
		},
	},

	"LC-PROCESS-STARTS": {
		kind: () => REF_KINDS.startingTrigger,
		legal({ set, holder, target }) {
			const context = contextOfHolder(holder);
			if (!context) return missing("the context of the process");
			const trigger = target as Consumable;
			if (trigger.type === "operation") {
				if (trigger.boundedcontext === context) return OK;
				return refuse(
					"process-in-context",
					`${label(trigger)} belongs to "${trigger.boundedcontext.name}"; the command that creates an instance is this context's own, though an event that starts one may cross`,
				);
			}
			if (trigger.internal && trigger.boundedcontext !== context)
				return refuse(
					"internal-consumable",
					`${label(trigger)} is internal to "${trigger.boundedcontext.name}", so nothing outside it reacts to it`,
				);
			return apartProblem(set, context, trigger);
		},
	},

	"LC-PROCESS-TRIGGER": {
		kind: (holder) =>
			holder.process
				? processTrigger(holder.process)
				: REF_KINDS.reactionTrigger,
		legal: ({ set, holder, target }) => {
			if (target instanceof Deadline)
				return target.process === holder.process
					? OK
					: refuse(
							"process-trigger",
							`${label(target)} belongs to process "${target.process.name}"; a deadline counts one process's instances and no other reactor knows they exist`,
						);
			return triggerProblem(set, holder, target, reactorOf(holder));
		},
	},

	"LC-DEADLINE-FROM": {
		kind: (holder) =>
			holder.process ? deadlineAnchor(holder.process) : undefined,
		legal({ holder, target }) {
			if (!holder.process)
				return missing("the process the deadline belongs to");
			if (target === holder.self)
				return refuse(
					"deadline-from",
					`${label(target)} cannot count from itself; a clock starts on something that happened before it`,
				);
			return OK;
		},
	},
};

/**
 * What a policy or process may wait for: an event of any context, unless it
 * is internal to another one; or an answer of an operation it made the call of.
 * An operation is issued, not waited for, so it is never offered, except a
 * process's own starting command, which the validator exempts.
 */
function triggerProblem(
	set: WorkspaceSet,
	holder: LegalHolder,
	target: object,
	reactor: Policy | Process | undefined,
): Verdict {
	const context = contextOfHolder(holder);
	if (!context) return missing("the context of the policy or process");
	if (target instanceof Answer) {
		if (!target.declared)
			return refuse(
				"consumable-kind",
				`${label(target.operation)} never declares the answer "${target.name}"; wait for an answer the operation says it comes back with, or react to an event instead`,
			);
		if (!reactor)
			return refuse(
				"consumable-kind",
				`nothing says it made the call of ${label(target.operation)} yet; an answer comes back to whoever called, so it can be waited for once it issues that operation or one that calls it`,
			);
		if (!hearsAnswerOf(reactor, target.operation))
			return refuse(
				"consumable-kind",
				`${label(reactor)} did not make the call of ${label(target.operation)}: it does not issue it, and no chain of "by" inside "${context.name}" runs from an operation it issues to the consumption of it; an answer comes back to whoever called`,
			);
		return OK;
	}
	const event = target as Consumable;
	// The validator exempts a process's own starting commands from every rule
	// about a subscription (validate.ts `subscribedEvents`), so one that also
	// sits in `on`/`ends` is tolerated there and not refused here.
	if (
		reactor instanceof Process &&
		(startingCommands(reactor) as object[]).includes(event)
	)
		return OK;
	if (event.type !== "event")
		return refuse(
			"consumable-kind",
			`${label(event)} is an operation, not an event; a policy or process reacts to events and to the answers of calls it made`,
		);
	if (event.internal && event.boundedcontext !== context)
		return refuse(
			"internal-consumable",
			`${label(event)} is internal to "${event.boundedcontext.name}", so nothing outside it reacts to it`,
		);
	return apartProblem(set, context, event);
}

/** Whether choosing `parent` as what `self` is a kind of would make a ring. */
function isKindOfSelf(
	parent: Entity | ValueObject,
	self: object | undefined,
): boolean {
	if (!self) return false;
	return (
		parent === self ||
		(parent.ancestors as Array<Entity | ValueObject>).includes(
			self as Entity | ValueObject,
		)
	);
}

/** The rule and the plain words for a relation the model refuses; only said, never decided, here. */
function relationProblem(
	source: Entity | ValueObject,
	relation: EntityRelationKind,
	target: Entity | ValueObject,
): [string, string] {
	const says = `"${source.name}" ${relation} "${target.name}"`;
	if (source.boundedcontext !== target.boundedcontext)
		return [
			"cross-context-relation",
			`${says} would cross from "${source.boundedcontext.name}" to "${target.boundedcontext.name}"; a relation never crosses a bounded context, except a "uses" of a value object the first may borrow through a shared kernel, as a conformist, or as a customer`,
		];
	if (source instanceof ValueObject)
		return [
			"value-object-shape",
			`${says}; a value is a value of something and nothing is reached through it, so a value object only uses another value`,
		];
	const across =
		source instanceof Entity &&
		target instanceof Entity &&
		source.aggregate !== target.aggregate;
	if (across)
		return [
			"cross-aggregate-reference",
			relation !== "references"
				? `${says} would reach into aggregate "${target.aggregate.name}"; across aggregates only "references" is allowed`
				: `${says} would reference ${target.name}, which is neither the root of aggregate "${target.aggregate.name}" nor a kind of that root`,
		];
	if (relation === "uses")
		return [
			"aggregate-tree",
			`${says}, which is an entity; "uses" points at a value object, and an entity the aggregate owns is included`,
		];
	return [
		"aggregate-tree",
		`${says}, which ${target instanceof ValueObject ? "is a value object; includes and references point at entities, and a value object is used" : "cannot hold it; a value object only uses"}`,
	];
}

// ---------------------------------------------------------------------------
// The questions
// ---------------------------------------------------------------------------

/**
 * Whether `holder` may name `target` in the field `cls` describes. One
 * predicate per class: {@link legalTargets} offers exactly what this accepts,
 * so a list and a guard cannot disagree.
 *
 * `holder` is read, not resolved: for an element that exists, build it with
 * {@link holderOf} on the set the question is about. A target that is not an
 * element of `set`, or is not the kind the field names, is refused with the
 * reason.
 */
export function isLegalTarget(
	set: WorkspaceSet,
	cls: LegalClassId,
	holder: LegalHolder,
	target: object,
): Verdict {
	const definition = CLASSES[cls];
	if (homeOf(target)?.set !== set)
		return refuse(
			"holder-incomplete",
			`${label(target)} is not an element of the files being edited`,
		);
	const kind = definition.kind(holder);
	if (!kind) return definition.legal({ set, holder, target });
	if (!kind.is(target))
		return refuse("wrong-kind", `${label(target)} is not ${kind.label}`);
	return definition.legal({ set, holder, target });
}

/**
 * Every element the field may name, across every file of the set: the elements
 * of the kind the field is read as, kept where {@link isLegalTarget} accepts
 * them, and where the loader would find them again by the pointer a file
 * writes. Two files' equal local ids are two candidates with their own
 * `file` and `key`.
 */
export function legalTargets(
	set: WorkspaceSet,
	cls: LegalClassId,
	holder: LegalHolder,
): Candidate[] {
	const kind = CLASSES[cls].kind(holder);
	if (!kind) return [];
	const found: Candidate[] = [];
	for (const element of elementsOf(set)) {
		if (!kind.is(element)) continue;
		if (!isLegalTarget(set, cls, holder, element).ok) continue;
		const home = workspaceOf(element) as Workspace;
		if (kind.lookup(home, (element as { ref: string }).ref) !== element)
			continue;
		found.push(candidateOf(element));
	}
	return found;
}

// ---------------------------------------------------------------------------
// The two fields that hold a value
// ---------------------------------------------------------------------------

/**
 * Why `context` cannot be `kind`, in plain words, or undefined when it can.
 * Switching to external or boundary-only is refused while the context holds
 * insides the model would then have to leave unstated (`external-is-boundary`,
 * `boundary-only-is-boundary`): aggregates, policies and processes, and for
 * boundary-only its invariants too. An external context's invariant must also
 * be a published contract and its operations may not be internal; those are
 * incomplete structure, reported by the rules, not a reason to refuse the
 * kind.
 */
export function systemKindProblem(
	context: BoundedContext,
	kind: SystemKind,
): string | undefined {
	if (kind !== "external" && kind !== "boundaryOnly") return undefined;
	const insides = [
		...[...context.aggregates.values()].map((it) => label(it)),
		...[...context.policies.values()].map((it) => label(it)),
		...[...context.processes.values()].map((it) => label(it)),
		...(kind === "boundaryOnly"
			? [...context.invariants.values()].map((it) => label(it))
			: []),
	];
	if (insides.length === 0) return undefined;
	const shown = insides.slice(0, 4).join(", ");
	const more = insides.length > 4 ? ` and ${insides.length - 4} more` : "";
	return kind === "external"
		? `"${context.name}" cannot be external while it declares ${shown}${more}; what happens inside a system we do not own is not ours to state, only what it provides and what it consumes`
		: `"${context.name}" cannot be modelled at its boundary only while it declares ${shown}${more}; such a context states what it offers and what it takes, and nothing about its insides until somebody interviews it`;
}

/**
 * The attribute names a relation of `owner` may draw with `for`: its own and
 * the ones it inherits (`relation-for-resolves`).
 */
export function relationForChoices(owner: Entity | ValueObject): string[] {
	return owner.allAttributes.map((it) => it.name);
}
