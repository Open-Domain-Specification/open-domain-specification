import {
	Answer,
	Attribute,
	BoundedContext,
	type Constrainable,
	Consumable,
	type Consumption,
	type ConsumptionCaller,
	type ContextRelationship,
	DataSchema,
	Deadline,
	Entity,
	type IdentityTarget,
	Policy,
	Process,
	type ProcessTrigger,
	type ReactionTrigger,
	type Referenceable,
	Subdomain,
	Team,
	ValueObject,
	type Workspace,
} from "./workspace";
import { type RefKind, refKind } from "./workspace-set";

/**
 * What each field that holds a `$ref` may name, as one {@link RefKind} apiece:
 * how to find a candidate by pointer in the file a ref names, and whether the
 * candidate is the kind that field wants. The loader resolves every written
 * ref through these, so a pointer is read the same way in a single workspace
 * and across a set, and the host sees the same four failures
 * (`invalid-path`, `missing-file`, `missing-target`, `wrong-kind`) wherever a
 * ref is written.
 *
 * The labels are the phrases `unresolved-ref` says the field should have
 * named.
 */

/** Any element, found by the workspace's own pointer lookup. */
function byRef(workspace: Workspace, pointer: string) {
	return workspace.getByRef(pointer);
}

const kind = <T extends object>(
	label: string,
	is: (found: object) => found is T,
	lookup: (workspace: Workspace, pointer: string) => object | undefined = byRef,
): RefKind<T> => refKind(label, lookup, is);

export const A_SCHEMA = kind(
	"a schema of this workspace",
	(it): it is DataSchema => it instanceof DataSchema,
);
export const A_CONSUMABLE = kind(
	"an operation or an event of this workspace",
	(it): it is Consumable => it instanceof Consumable,
);
export const A_VALUE_OBJECT = kind(
	"a value object of this workspace",
	(it): it is ValueObject => it instanceof ValueObject,
);
export const AN_ENTITY = kind(
	"an entity of this workspace",
	(it): it is Entity => it instanceof Entity,
);
export const A_RELATION_TARGET = kind(
	"an entity or a value object of this workspace",
	(it): it is Entity | ValueObject =>
		it instanceof Entity || it instanceof ValueObject,
);
export const AN_IDENTITY_TARGET = kind(
	"an entity of this workspace, or a bounded context whose entities it does not state, or a schema such a context publishes",
	(it): it is IdentityTarget =>
		it instanceof Entity ||
		it instanceof BoundedContext ||
		it instanceof DataSchema,
);
export const A_CALLER = kind(
	"an operation, a policy or a process of this workspace",
	(it): it is ConsumptionCaller =>
		it instanceof Consumable || it instanceof Policy || it instanceof Process,
);
export const A_TEAM = kind(
	"a team of this workspace",
	(it): it is Team => it instanceof Team,
);
export const A_SUBDOMAIN = kind(
	"a subdomain of one of this workspace's domains",
	(it): it is Subdomain => it instanceof Subdomain,
);
export const A_CONSTRAINABLE = kind(
	"an entity, a value object, an attribute or a consumable of this workspace",
	(it): it is Constrainable =>
		it instanceof Entity ||
		it instanceof ValueObject ||
		it instanceof Attribute ||
		it instanceof Consumable,
);
export const A_REACTION_TRIGGER = kind(
	"an event, or an answer an operation comes back with",
	(it): it is ReactionTrigger =>
		it instanceof Consumable || it instanceof Answer,
);
export const A_STARTING_TRIGGER = kind(
	"an event, or an operation of this process's own context",
	(it): it is Consumable => it instanceof Consumable,
);
export const AN_ELEMENT = kind(
	"an element of this workspace",
	(it): it is Referenceable => true,
);
export const A_CONTEXT = kind(
	"a bounded context of this workspace",
	(it): it is BoundedContext => it instanceof BoundedContext,
);

/**
 * A relationship is a pairing rather than a named element, so it is found
 * through its declaring file's relationship list by the ref that file gives it
 * (the five or six segment form, or the seven or eight segment one when an end
 * is in another file), not through {@link Workspace.getByRef}.
 */
export const AN_AGREEMENT = kind(
	"a relationship between two bounded contexts of this workspace",
	(_it): _it is ContextRelationship => true,
	(workspace, pointer) => workspace.findRelationship(pointer),
);

/** A consumption is a pairing too, found through its consumers by its own ref. */
export const A_CONSUMPTION = kind(
	"a consumption of an operation or an event of this workspace",
	(_it): _it is Consumption => true,
	(workspace, pointer) => workspace.findConsumption(pointer),
);

/**
 * An answer: what an operation comes back with, named by the operation and
 * the outcome (`.../returns`, `.../completed`, `.../rejects/<context>/<schema>`
 * or `.../rejects-in/<path>/<context>/<schema>` for a refusal with a schema of
 * another file). Found by the operation's own file, which reads the prefix.
 */
export const AN_ANSWER = kind(
	"an answer an operation comes back with",
	(it): it is Answer => it instanceof Answer,
	(workspace, pointer) => workspace.getAnswerByRef(pointer),
);

/**
 * What a process may wait for or end on: an event, an answer, or one of *its
 * own* deadlines.
 *
 * A deadline of another process is refused here rather than reported by a
 * rule, for the reason the DSL refuses it: a per-instance clock starts when
 * one instance began waiting, so no other reactor knows the instance exists,
 * and a ref to somebody else's is not a thing this field can name at all.
 */
export function processTrigger(process: Process): RefKind<ProcessTrigger> {
	return kind(
		"an event, an answer an operation comes back with, or one of this process's own deadlines",
		(it): it is ProcessTrigger =>
			it instanceof Consumable ||
			it instanceof Answer ||
			(it instanceof Deadline && it.process === process),
	);
}

/**
 * What a deadline's `from` may name: one of the triggers the process already
 * waits for.
 *
 * A clock starts on a moment the instance can tell has arrived, and the only
 * moments it knows are the ones it listens for, so anything else is not a
 * thing this field can name — reported the same way a ref that names nothing
 * at all is, rather than throwing out of `countsFrom` at load.
 */
export function deadlineAnchor(process: Process): RefKind<ProcessTrigger> {
	const trigger = processTrigger(process);
	return kind(
		"one of the triggers this process starts or waits on",
		(it): it is ProcessTrigger =>
			trigger.is(it) &&
			[...process.startEvents, ...process.events].includes(it),
	);
}

/**
 * Every kind a `$ref` field of the metamodel may name, by what it names, for a
 * host that resolves a ref it holds through `WorkspaceSet.resolve`. The two
 * kinds that depend on a process are the functions {@link processTrigger} and
 * {@link deadlineAnchor}.
 */
export const REF_KINDS = {
	schema: A_SCHEMA,
	consumable: A_CONSUMABLE,
	valueObject: A_VALUE_OBJECT,
	entity: AN_ENTITY,
	relationTarget: A_RELATION_TARGET,
	identityTarget: AN_IDENTITY_TARGET,
	caller: A_CALLER,
	team: A_TEAM,
	subdomain: A_SUBDOMAIN,
	constrainable: A_CONSTRAINABLE,
	reactionTrigger: A_REACTION_TRIGGER,
	startingTrigger: A_STARTING_TRIGGER,
	element: AN_ELEMENT,
	context: A_CONTEXT,
	relationship: AN_AGREEMENT,
	consumption: A_CONSUMPTION,
	answer: AN_ANSWER,
} as const;
