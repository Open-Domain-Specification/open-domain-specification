import {
	dispositionOf,
	intentsWithoutComments,
	relationshipsWithoutComments,
	type StrategicIntent,
} from "./evidence";
import { attributeOwnersIn, identityCrossings } from "./identity-crossings";
import {
	answersOf,
	operationsCalledBy,
	ReactionChain,
	type Reactor,
	reachedEvents,
} from "./reaction-walk";
import type { UpstreamRole } from "./schema";
import {
	Aggregate,
	Attribute,
	type AttributeOwner,
	BoundedContext,
	type Constrainable,
	Consumable,
	Consumption,
	type ConsumptionCaller,
	ContextRelationship,
	constrainableLabel,
	DataSchema,
	Entity,
	type EntityRelation,
	type Invariant,
	isDirectedRelationshipType,
	Policy,
	Process,
	type ReactionTrigger,
	type Service,
	ValueObject,
	type Workspace,
} from "./workspace";

export type DiagnosticSeverity = "error" | "warning";

export type Diagnostic = {
	severity: DiagnosticSeverity;
	/** A stable rule id, e.g. `aggregate-root`. */
	rule: string;
	message: string;
	/** The element the diagnostic is about. */
	ref: string;
};

type Rule = (workspace: Workspace) => Diagnostic[];

/**
 * The contexts whose insides the model states, which is every context we are
 * not merely integrating with. An external context has no internals of ours
 * to check: `external-is-boundary` says so once, and the rules about
 * aggregates, entities, invariants, policies and processes stay quiet rather
 * than repeating it element by element (decision 28).
 */
function* modelledContexts(workspace: Workspace): Iterable<BoundedContext> {
	for (const bc of workspace.boundedcontexts.values())
		if (!bc.external) yield bc;
}

function* aggregatesOf(workspace: Workspace): Iterable<Aggregate> {
	for (const bc of modelledContexts(workspace)) yield* bc.aggregates.values();
}

/**
 * The contexts whose insides are knowable, which is every context except a big
 * ball of mud.
 *
 * A big ball of mud is the enterprise's own, so unlike an external context it
 * may state aggregates, rules and reactions and every rule about what it does
 * state applies. What it cannot be held to is completeness. Nobody can read a
 * forty-year-old core banking system well enough to say which of its programs
 * raises a fact, or what leads its clusters: this record's own argument, that
 * stating a system's insides is invention, applies here too, and three
 * reference models answered `event-unraised` by inventing a nightly batch
 * service so an event had a raiser. So a mud context may say what it emits
 * without saying how, and may name a cluster without naming its root
 * (decision 28, second amendment; card 90).
 */
function* knowableContexts(workspace: Workspace): Iterable<BoundedContext> {
	for (const bc of modelledContexts(workspace)) if (!bc.bigBallOfMud) yield bc;
}

/** The aggregates of the contexts whose insides are knowable. */
function* knowableAggregatesOf(workspace: Workspace): Iterable<Aggregate> {
	for (const bc of knowableContexts(workspace)) yield* bc.aggregates.values();
}

/**
 * Everything that can hold attributes and relations, in declaration order.
 * An external context's value objects are still its published vocabulary, so
 * they are checked; only the entities inside an aggregate we do not own are
 * left alone.
 */
function* modelMembersOf(workspace: Workspace): Iterable<Entity | ValueObject> {
	for (const bc of workspace.boundedcontexts.values()) {
		yield* bc.valueobjects.values();
		if (bc.external) continue;
		for (const aggregate of bc.aggregates.values())
			yield* aggregate.entities.values();
	}
}

/** The attribute-owner walk of one context, with the context it is in. */
function* attributeOwnersOf(
	workspace: Workspace,
): Iterable<{ owner: AttributeOwner; context: BoundedContext }> {
	for (const context of workspace.boundedcontexts.values())
		for (const owner of attributeOwnersIn(context)) yield { owner, context };
}

function* relationsOf(workspace: Workspace): Iterable<EntityRelation> {
	for (const member of modelMembersOf(workspace)) yield* member.relations;
}

/**
 * The aggregate a relation end sits in, or undefined for a value object: a
 * value object belongs to the whole context (decision 16), so it sits inside
 * no one aggregate's boundary.
 */
function aggregateOfEnd(member: Entity | ValueObject): Aggregate | undefined {
	return member instanceof Entity ? member.aggregate : undefined;
}

/** Every process of the contexts whose insides the model states. */
function* processesOf(workspace: Workspace): Iterable<Process> {
	for (const bc of modelledContexts(workspace)) yield* bc.processes.values();
}

/**
 * Everything a policy or a process waits for. A process listens at three
 * points in a lifecycle rather than one, and every rule that reads a policy's
 * `on` — separate ways, internal consumables, the kind of each one — means the
 * same thing by all three (decision 23).
 */
function subscribedTriggers(reactor: Policy | Process): ReactionTrigger[] {
	return reactor instanceof Process
		? [...reactor.startEvents, ...reactor.events, ...reactor.endEvents]
		: reactor.events;
}

/**
 * The consumables a policy or a process waits for, which is what every rule
 * about a subscription is about: an event is published by a provider in a
 * context, and that is what makes it a crossing, an internal consumable or the
 * wrong kind of thing to react to. An answer is none of those — it is a shape,
 * and what carries it is the operation the reactor's own context already
 * consumes — so it is left to `consumable-kind`, which is where the model says
 * what an answer has to be (decision 23, second amendment).
 */
function subscribedEvents(reactor: Policy | Process): Consumable[] {
	return subscribedTriggers(reactor).filter(
		(it): it is Consumable => !(it instanceof DataSchema),
	);
}

/**
 * Every schema the operations one context consumes answer with: what it
 * returns and what it rejects with, on every consumption that context declares
 * (decisions 13 and 25).
 *
 * This is the whole of what a reaction in that context may wait on as an
 * answer. A context hears an answer because it made the call, so the call has
 * to be one it makes: an answer from an operation nobody here consumes is a
 * shape this context never sees come back.
 */
function answersAwaitedIn(bc: BoundedContext): Set<DataSchema> {
	const answers = new Set<DataSchema>();
	for (const operation of operationsCalledBy(bc))
		for (const answer of answersOf(operation)) answers.add(answer);
	return answers;
}

/** Every policy and process of a context, in declaration order. */
function reactorsOf(bc: BoundedContext): Array<Policy | Process> {
	return [...bc.policies.values(), ...bc.processes.values()];
}

/** How a diagnostic names one: "Policy" or "Process". */
function reactorLabel(reactor: Policy | Process): string {
	return reactor instanceof Process ? "Process" : "Policy";
}

function* consumptionsOf(workspace: Workspace): Iterable<Consumption> {
	for (const bc of workspace.boundedcontexts.values()) {
		for (const member of [...bc.aggregates.values(), ...bc.services.values()]) {
			yield* member.consumptions;
		}
	}
}

/**
 * Every aggregate has exactly one root entity, in every context whose insides
 * are knowable; a big ball of mud may name a cluster without naming what leads
 * it (see {@link knowableContexts}).
 */
const aggregateRoot: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of knowableAggregatesOf(workspace)) {
		const roots = Array.from(aggregate.entities.values()).filter((e) => e.root);
		if (roots.length === 1) continue;
		diagnostics.push({
			severity: roots.length === 0 ? "warning" : "error",
			rule: "aggregate-root",
			message:
				roots.length === 0
					? `Aggregate "${aggregate.name}" has no root entity`
					: `Aggregate "${aggregate.name}" has ${roots.length} root entities; an aggregate has exactly one`,
			ref: aggregate.ref,
		});
	}
	return diagnostics;
};

/** Whether an entity is the root of its aggregate, or a kind of that root. */
function reachedAsRoot(member: Entity | ValueObject): boolean {
	if (!(member instanceof Entity)) return false;
	return member.root || member.ancestors.some((it) => it.root);
}

/**
 * A relation into another aggregate may only reference that aggregate's root,
 * and may not include or use its members directly. A value object at either
 * end crosses no aggregate boundary: it belongs to the context, and every
 * aggregate of that context may hold one. That left a gap while a value object
 * could relate to an entity at all — a value reaching into another aggregate's
 * insides was in no aggregate, so this rule never saw it — and the gap is
 * closed where it belongs, on the shape of a value object rather than on the
 * aggregate boundary (`value-object-shape`, card 92).
 *
 * A kind of the root counts as the root at the target end: an instance of it
 * is an instance of the root, reached through the same identity, so a
 * reference that names the kind the business names is holding the root's
 * identity all the same (decision 22). The source end needs no such reading,
 * because an entity is a kind of an entity of its own aggregate: an inherited
 * relation crosses exactly what the parent's crosses, and is reported once,
 * against the parent that declares it.
 */
const crossAggregateReference: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const relation of relationsOf(workspace)) {
		const source = aggregateOfEnd(relation.source);
		const target = aggregateOfEnd(relation.target);
		if (!source || !target || source === target) continue;
		if (relation.relation !== "references") {
			diagnostics.push({
				severity: "error",
				rule: "cross-aggregate-reference",
				message: `"${relation.source.name}" ${relation.relation} "${relation.target.name}" in another aggregate; across aggregates only "references" is allowed`,
				ref: relation.source.ref,
			});
		} else if (!reachedAsRoot(relation.target)) {
			diagnostics.push({
				severity: "error",
				rule: "cross-aggregate-reference",
				message: `"${relation.source.name}" references "${relation.target.name}", which is neither the root of aggregate "${target.name}" nor a kind of that root; reference "${target.name}" by its root's identity, holding "${relation.target.name}"'s id beside it when the child is what you mean`,
				ref: relation.source.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * A relation never crosses a bounded context. Crossing a boundary is an
 * integration, so the source holds the other entity's identity as an attribute
 * and the dependency reads on the consumable map instead.
 */
const crossContextRelation: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const relation of relationsOf(workspace)) {
		const source = relation.source.boundedcontext;
		const target = relation.target.boundedcontext;
		if (source === target) continue;
		diagnostics.push({
			severity: "error",
			rule: "cross-context-relation",
			message: `"${relation.source.name}" in "${source.name}" ${relation.relation} "${relation.target.name}" in "${target.name}"; a relation never crosses a bounded context, so hold "${relation.target.name}"'s identity as an attribute on "${relation.source.name}" instead`,
			ref: relation.source.ref,
		});
	}
	return diagnostics;
};

/**
 * An attribute that holds an identity names an entity of this workspace, root
 * or child, anywhere in it, or an external context. A child id is what real
 * systems hold: a playback session knows which profile inside a household it
 * plays for, a claim which coverage of a policy it is against, and each of
 * those children stays inside its aggregate precisely because its parent's
 * invariants need it there. Only the id crosses — the holder reaches the child
 * through its root, so the dependency is on the aggregate that root leads
 * (decision 14).
 *
 * That holds inside one context as well as across a boundary. A shipment
 * carries an order's id and the order line's id beside it, and that pair is how
 * DDD points at a child without reaching for it: what is refused is the
 * relation into another aggregate's insides, which `cross-aggregate-reference`
 * refuses and whose fix text recommends exactly this id. Card 90 read the id as
 * a side door around reference-by-root and refused it within one context; that
 * was wrong, and the refusal is gone (decision 14, third amendment).
 *
 * An external context has no entities of ours to name (decision 28), and a
 * card scheme's authorisation id or a payment provider's customer id is still
 * an id of something: the attribute names the system it belongs to, and the
 * maps draw the dependency on that context. A context that is not external is
 * refused, because there the entity does exist and is what the id is of —
 * naming the whole context instead would say less than the model already
 * holds.
 *
 * What the rule otherwise refuses is an identity naming an entity this
 * workspace does not have: one built against another workspace, or dropped
 * since, where the id reaches nothing.
 */
const identifiesEntity: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const { owner } of attributeOwnersOf(workspace)) {
		for (const attribute of owner.attributes.values()) {
			const target = attribute.identifies;
			if (!target) continue;
			if (target instanceof BoundedContext) {
				if (target.external) continue;
				diagnostics.push({
					severity: "error",
					rule: "identifies-entity",
					message: `"${owner.name}" holds attribute "${attribute.name}" as the identity of bounded context "${target.name}", which is not external; a context whose insides the model states has the entity the id is of, so name that entity instead`,
					ref: attribute.ref,
				});
				continue;
			}
			if (workspace.getEntityByRef(target.ref) !== target) {
				diagnostics.push({
					severity: "error",
					rule: "identifies-entity",
					message: `"${owner.name}" holds attribute "${attribute.name}" as the identity of "${target.name}", which is not an entity of this workspace; an identity names an entity here, root or child, and a child is reached through its root, or an external context when the id belongs to a system whose entities are not ours to state`,
					ref: attribute.ref,
				});
			}
		}
	}
	return diagnostics;
};

/**
 * An aggregate's root entity is identified by something. Without an identity
 * attribute nothing says which instance a reference points at. A big ball of
 * mud is exempt, as it is from `aggregate-root`: nobody can read its keys
 * either (see {@link knowableContexts}).
 */
const rootIdentity: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of knowableAggregatesOf(workspace)) {
		for (const root of aggregate.entities.values()) {
			if (!root.root) continue;
			const identified = Array.from(root.attributes.values()).some(
				(a) => a.identity,
			);
			if (identified) continue;
			diagnostics.push({
				severity: "error",
				rule: "root-identity",
				message: `Root entity "${root.name}" of aggregate "${aggregate.name}" declares no identity attribute, so nothing says which "${root.name}" a reference means`,
				ref: root.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * Every other entity is identified by something too. An entity is the thing
 * you can still tell apart from another that holds exactly the same values;
 * with no identity attribute nothing does the telling apart, and what is left
 * is a value object. The root's own identity is `root-identity`'s business,
 * and an error there because a reference cannot land without it; inside the
 * boundary it is a warning, because the modeller may simply not have named the
 * identity yet.
 *
 * A kind is identified by whatever it is a kind of: an inherited identity is
 * the subtype's, and repeating it would be `specialisation-redeclares`.
 *
 * A big ball of mud is exempt, as it is from `aggregate-root`, `root-identity`
 * and `event-unraised`: nobody can read a forty-year-old system well enough to
 * say which column tells one of its rows from another, and asking only invites
 * an invented key (see {@link knowableContexts}).
 */
const entityIdentity: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of knowableAggregatesOf(workspace)) {
		for (const entity of aggregate.entities.values()) {
			if (entity.root) continue;
			const identified = entity.allAttributes.some((a) => a.identity);
			if (identified) continue;
			diagnostics.push({
				severity: "warning",
				rule: "entity-identity",
				message: `Entity "${entity.name}" in aggregate "${aggregate.name}" declares no identity attribute; an entity is what you tell apart from another holding the same values, so without one "${entity.name}" is a value object`,
				ref: entity.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * A value object is compared by its values, so it carries no identity of its
 * own, owns no lifecycle and reaches no entity: no identity attribute, and its
 * relations `uses` other values.
 *
 * The entity end is what `cross-aggregate-reference` cannot judge. That rule
 * reads the aggregate at each end of a relation and a value object is in none —
 * it belongs to the whole context (decision 16) — so a value reaching into
 * another aggregate's insides went unreported while the same relation from an
 * entity was refused. It is refused here instead, and for a reason of its own
 * rather than the aggregate boundary's: a value is a value of something, and
 * nothing is reached through it. What a value holds of an entity is that
 * entity's id, as an attribute with `identifies`, which is how anything crosses
 * to an entity it does not own (decision 14).
 */
const valueObjectShape: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		for (const vo of bc.valueobjects.values()) {
			for (const attribute of vo.attributes.values()) {
				if (!attribute.identity) continue;
				diagnostics.push({
					severity: "error",
					rule: "value-object-shape",
					message: `Value object "${vo.name}" marks attribute "${attribute.name}" as an identity; two value objects with the same values are the same value, so it has no identity of its own`,
					ref: vo.ref,
				});
			}
			for (const relation of vo.relations) {
				if (relation.target instanceof Entity) {
					diagnostics.push({
						severity: "error",
						rule: "value-object-shape",
						message: `Value object "${vo.name}" ${relation.relation} entity "${relation.target.name}"; a value is a value of something and nothing is reached through it, so a value object relates only to other values — hold "${relation.target.name}"'s id as an attribute with identifies instead`,
						ref: vo.ref,
					});
					continue;
				}
				if (relation.relation === "uses") continue;
				diagnostics.push({
					severity: "error",
					rule: "value-object-shape",
					message:
						relation.relation === "includes"
							? `Value object "${vo.name}" includes "${relation.target.name}"; only an entity owns the lifecycle of what it includes, so "${vo.name}" uses "${relation.target.name}" instead`
							: `Value object "${vo.name}" references "${relation.target.name}"; a reference holds another aggregate's identity and a value has none, so "${vo.name}" uses "${relation.target.name}" instead`,
					ref: vo.ref,
				});
			}
		}
	}
	return diagnostics;
};

/**
 * An identity attribute is never optional.
 *
 * An identity is what tells one instance from another holding the same values,
 * and what a reference, an event payload or a stored row names the instance by
 * (decision 24). If it may be missing then some instances cannot be told apart
 * or reached at all, and the element has no identity — it is a value object, or
 * the model is missing the attribute that really identifies it.
 */
const identityNotOptional: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const { owner } of attributeOwnersOf(workspace)) {
		for (const attribute of owner.attributes.values()) {
			if (!attribute.identity || !attribute.optional) continue;
			diagnostics.push({
				severity: "error",
				rule: "identity-not-optional",
				message: `"${owner.name}" marks attribute "${attribute.name}" as both an identity and optional; an identity that may be missing cannot say which "${owner.name}" a reference means`,
				ref: attribute.ref,
			});
		}
	}
	return diagnostics;
};

/** Everything that says it is a kind of something else (decision 22). */
function* subtypesOf(workspace: Workspace): Iterable<Entity | ValueObject> {
	for (const member of modelMembersOf(workspace))
		if (member.specialises) yield member;
}

/**
 * A kind is a kind of something inside the same boundary.
 *
 * An entity is a kind of an entity of its own aggregate, because the subtype
 * is the same thing said more precisely: it is loaded, saved and kept
 * consistent through the one root, and a parent in another aggregate would
 * make one boundary's invariants depend on another's. A value object is a
 * kind of one its own context declares, or of one it borrows: over a shared
 * kernel, the relationship that says two contexts keep part of one model
 * between them (decision 16), or down a relationship it has declared itself a
 * conformist on, where it takes the upstream's model as it stands rather than
 * translating it (decision 03). Those are the two places a kind may reach
 * across, and the conformist one reaches in one direction only.
 */
const specialisationInBoundary: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const member of subtypesOf(workspace)) {
		const parent = member.specialises;
		if (!parent) continue;
		if (member instanceof Entity) {
			if (aggregateOfEnd(parent) === member.aggregate) continue;
			diagnostics.push({
				severity: "error",
				rule: "specialisation-in-boundary",
				message: `"${member.name}" in aggregate "${member.aggregate.name}" is a kind of "${parent.name}", which is not an entity of that aggregate; an entity is a kind of an entity of its own aggregate, since both are saved through the same root`,
				ref: member.ref,
			});
			continue;
		}
		const context = member.boundedcontext;
		const owner = parent.boundedcontext;
		if (owner === context || mayBorrowFrom(workspace, context, owner)) continue;
		diagnostics.push({
			severity: "error",
			rule: "specialisation-in-boundary",
			message: `"${member.name}" in "${context.name}" is a kind of "${parent.name}" in "${owner.name}", which "${context.name}" neither shares a kernel with nor conforms to; a value object is a kind of one its own context declares, or of one it borrows through a shared kernel or as a conformist of the context that owns it`,
			ref: member.ref,
		});
	}
	return diagnostics;
};

/**
 * The chain of kinds ends. A thing that is, at some remove, a kind of itself
 * has no attributes anybody can list and no page anybody can read to the end,
 * and the model has lost the concept the chain was meant to refine.
 */
const specialisationCycle: Rule = (workspace) => {
	const rings = cyclesOf(
		modelMembersOf(workspace),
		(member) => (member.specialises ? [member.specialises] : []),
		(member) => member.ref,
	);
	return rings.map((ring) => ({
		severity: "error" as const,
		rule: "specialisation-cycle",
		message: `${ring.map((it) => `"${it.name}"`).join(" is a kind of ")} is a kind of "${ring[0].name}"; a chain of kinds ends at the thing every one of them is, so nothing is a kind of itself`,
		ref: ring[0].ref,
	}));
};

/**
 * A kind of an entity is never itself the aggregate's root. The aggregate has
 * one root, which is what the rest of the model reaches it by, and a kind of
 * that root is reached through it: naming two roots would leave a reference
 * unable to say which of them it lands on.
 */
const specialisationNotRoot: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const member of subtypesOf(workspace)) {
		if (!(member instanceof Entity) || !member.root) continue;
		diagnostics.push({
			severity: "error",
			rule: "specialisation-not-root",
			message: `"${member.name}" is a kind of "${member.specialises?.name}" and is also marked the root of aggregate "${member.aggregate.name}"; an aggregate has one root, and a kind of it is reached through that root`,
			ref: member.ref,
		});
	}
	return diagnostics;
};

/**
 * A kind does not repeat an attribute it already has. Two declarations of one
 * name leave a reader unable to say which applies — the parent's type and
 * description, or the kind's — and whichever the answer, one of the two is
 * saying something the model never asked for.
 */
const specialisationRedeclares: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const member of subtypesOf(workspace)) {
		// Nearest parent first, so the origin named is the one a reader meets
		// first walking up the chain.
		const inherited = new Map<string, Attribute>();
		for (const attribute of member.inheritedAttributes)
			if (!inherited.has(attribute.name))
				inherited.set(attribute.name, attribute);
		for (const attribute of member.attributes.values()) {
			const already = inherited.get(attribute.name);
			if (!already) continue;
			diagnostics.push({
				severity: "error",
				rule: "specialisation-redeclares",
				message: `"${member.name}" declares attribute "${attribute.name}", which it already has from "${already.owner.name}"; a kind adds to what it is a kind of and never restates it, or a reader cannot tell which of the two applies`,
				ref: attribute.ref,
			});
		}
	}
	return diagnostics;
};

/** Adds one value to the list a key holds, starting the list if there is none. */
function append<K, V>(index: Map<K, V[]>, key: K, value: V): void {
	const existing = index.get(key);
	if (existing) existing.push(value);
	else index.set(key, [value]);
}

/** Rotates a ring so its lowest key leads, so the same ring always reads the same way. */
function leadWithLowestKey<N>(ring: N[], keyOf: (node: N) => string): N[] {
	let lead = 0;
	for (let i = 1; i < ring.length; i++) {
		if (keyOf(ring[i]) < keyOf(ring[lead])) lead = i;
	}
	return [...ring.slice(lead), ...ring.slice(0, lead)];
}

/**
 * The rings a directed graph closes on itself, each as its nodes in order.
 *
 * One ring per back edge of the depth-first walk, the shape `aggregate-tree`
 * already uses for `includes`: every cycle carries at least one back edge, so
 * nothing cyclic goes unreported, while a graph with none is walked once.
 * Rings are rotated to their lowest key and de-duplicated by it, so which node
 * the walk happened to start from changes neither the message nor the ref.
 */
function cyclesOf<N>(
	nodes: Iterable<N>,
	nextOf: (node: N) => Iterable<N>,
	keyOf: (node: N) => string,
): N[][] {
	const rings: N[][] = [];
	const seen = new Set<string>();
	const path: N[] = [];
	const onPath = new Set<N>();
	const walked = new Set<N>();

	const walk = (node: N) => {
		onPath.add(node);
		path.push(node);
		for (const next of nextOf(node)) {
			if (onPath.has(next)) {
				const ring = leadWithLowestKey(path.slice(path.indexOf(next)), keyOf);
				const key = ring.map(keyOf).join(">");
				if (seen.has(key)) continue;
				seen.add(key);
				rings.push(ring);
				continue;
			}
			if (!walked.has(next)) walk(next);
		}
		path.pop();
		onPath.delete(node);
		walked.add(node);
	};

	for (const node of nodes) if (!walked.has(node)) walk(node);
	return rings;
}

/**
 * Whether `aggregate-tree` is the rule that reads this relation's kind. It
 * reads the ones that stay inside a context and inside an aggregate, plus
 * every relation to a value object, which the whole context shares. A relation
 * between two aggregates' entities is `cross-aggregate-reference`'s, and one
 * between two contexts is `cross-context-relation`'s.
 */
function saysWhatItPointsAt(relation: EntityRelation): boolean {
	if (relation.source.boundedcontext !== relation.target.boundedcontext)
		return false;
	const source = aggregateOfEnd(relation.source);
	const target = aggregateOfEnd(relation.target);
	return !source || !target || source === target;
}

/**
 * Within one aggregate `includes` says whole-part: it points at entities and
 * `uses` points at value objects (decision 10's conventions), and every entity
 * is reachable from the root, because the aggregate is loaded and saved as one
 * thing through it.
 *
 * What the rule does not do is judge cycles among types. The tree is a tree of
 * instances and the model declares types, and a ring in the type graph says
 * nothing conclusive about the instances: a questionnaire's groups contain
 * questions that contain groups, and every questionnaire is still a finite
 * tree. Earlier wordings forbade self-inclusion, then mutual inclusion, and
 * were wrong both times for the same reason (decision 15, card 82); keeping
 * the instance tree a tree is the code's job, not the model's. Relations that
 * leave the aggregate belong to `cross-aggregate-reference`.
 */
const aggregateTree: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const member of modelMembersOf(workspace)) {
		for (const relation of member.relations) {
			if (!saysWhatItPointsAt(relation)) continue;
			if (relation.relation === "uses") {
				if (relation.target instanceof ValueObject) continue;
				diagnostics.push({
					severity: "error",
					rule: "aggregate-tree",
					message: `"${member.name}" uses "${relation.target.name}", which is an entity; "uses" points at a value object, and an entity the aggregate owns is included`,
					ref: member.ref,
				});
				continue;
			}
			// A value object that includes anything is value-object-shape's.
			if (relation.relation !== "includes" || !(member instanceof Entity))
				continue;
			if (relation.target instanceof Entity) continue;
			diagnostics.push({
				severity: "error",
				rule: "aggregate-tree",
				message: `"${member.name}" includes "${relation.target.name}", which is a value object; "includes" points at an entity, and a value object is used`,
				ref: member.ref,
			});
		}
	}
	for (const aggregate of aggregatesOf(workspace)) {
		diagnostics.push(...orphanEntities(aggregate));
	}
	return diagnostics;
};

/**
 * One diagnostic per entity that no chain of `includes` or `references`
 * reaches from a root of the aggregate. An aggregate with no root at all is
 * `aggregate-root`'s business, so this says nothing about it.
 *
 * A kind is reached wherever the entity it is a kind of is reached, because
 * an instance of the kind is an instance of that entity — a kind of the root
 * is reached through the root (decision 22).
 */
function orphanEntities(aggregate: Aggregate): Diagnostic[] {
	const roots = Array.from(aggregate.entities.values()).filter((e) => e.root);
	if (roots.length === 0) return [];
	const reached = new Set<Entity>();
	const walk = (entity: Entity) => {
		if (reached.has(entity)) return;
		reached.add(entity);
		for (const kind of entity.kinds) walk(kind);
		for (const relation of entity.relations) {
			if (relation.relation === "uses") continue;
			const { target } = relation;
			if (target instanceof Entity && target.aggregate === aggregate)
				walk(target);
		}
	};
	for (const root of roots) walk(root);
	return Array.from(aggregate.entities.values())
		.filter((entity) => !reached.has(entity))
		.map((entity) => ({
			severity: "warning" as const,
			rule: "aggregate-tree",
			message: `"${entity.name}" is in aggregate "${aggregate.name}" but no chain of "includes" or "references" reaches it from ${roots
				.map((r) => `"${r.name}"`)
				.join(" or ")}, so nothing inside the boundary can get to it`,
			ref: entity.ref,
		}));
}

/**
 * The `uses` relations in `relations` that point at `vo`.
 *
 * An entity may use one value object twice — a current address and an address
 * history are both Addresses — so the pair of an attribute and its relation is
 * a match, not a lookup: with one relation to the value object it is that one,
 * and with several it is the one whose label is the attribute's name.
 */
function usesOfValueObject(
	relations: EntityRelation[],
	vo: ValueObject,
): EntityRelation[] {
	return relations.filter((r) => r.relation === "uses" && r.target === vo);
}

/**
 * What one relation says about how many there are, against what the attribute
 * says. Presence and size are two different facts: `optional` says whether the
 * attribute is there at all, and the cardinality says how many the value may
 * hold. A required list may hold none — Swagger's `photoUrls` is required with
 * no minimum — so presence says nothing about size once the attribute is a
 * list.
 *
 * That leaves three pairings. A list is a `*` or a `1..*` whether or not it is
 * optional; an attribute that is not a list is a `1` when it is required and a
 * `0..1` when it is optional. A relation with no cardinality says nothing and
 * is left alone (card 89, decisions 24 and 26).
 */
function cardinalityDiagnostics(
	member: Entity | ValueObject,
	attribute: Attribute,
	relation: EntityRelation,
): Diagnostic[] {
	const cardinality = relation.cardinality;
	if (!cardinality) return [];
	const target = relation.target.name;
	const says = (what: string) =>
		`"${member.name}" types attribute "${attribute.name}" ${what} but its "uses" relation to "${target}" has cardinality "${cardinality}"`;
	const diagnostics: Diagnostic[] = [];
	const warn = (message: string) =>
		diagnostics.push({
			severity: "warning" as const,
			rule: "attribute-relation-coherence",
			message,
			ref: member.ref,
		});
	if (attribute.type.trim().endsWith("[]")) {
		if (cardinality === "1" || cardinality === "0..1") {
			warn(
				`${says(`as a list ("${attribute.type}")`)}; presence says whether the list is there and cardinality says how many it may hold, so a list pairs with "*" or "1..*"`,
			);
		}
		return diagnostics;
	}
	if (attribute.optional && cardinality !== "0..1") {
		warn(
			`${says("as optional")}; an attribute that is optional and not a list pairs with "0..1"`,
		);
	}
	if (!attribute.optional && cardinality !== "1") {
		warn(
			`${says("as required")}; an attribute that is required and not a list pairs with "1"`,
		);
	}
	return diagnostics;
}

/**
 * An attribute typed by a value object and a `uses` relation to it are two
 * halves of the same statement, and each half has to say the same about how
 * many there are and whether there is one at all.
 *
 * The attribute's `type` is free text by decision 15, so the validator does
 * not parse it and never asks it to spell the value object's name. The one
 * exception is the trailing `[]`, the convention the cardinality check reads
 * as "many"; `optional` and the relation's cardinality are read as themselves.
 *
 * When several relations point at one value object the halves are paired by
 * `for`: a customer with a current address and an address history declares two
 * `uses` relations to Address, and each names the attribute it draws. The
 * label stays the phrase the relation map reads. With a single relation to the
 * value object nothing is named, which is the common case; where several point
 * at it and none names the attribute, the pairing is ambiguous and reported
 * rather than guessed.
 *
 * Inherited attributes and relations are the subtype's (decision 22): a kind
 * that adds an attribute typed by a value object its parent already uses is
 * coherent, and so is a kind that uses one the parent's attribute is typed by.
 * Only what the member declares itself is reported, so a parent's own mismatch
 * is one diagnostic on the parent rather than one per kind of it.
 */
const attributeRelationCoherence: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const member of modelMembersOf(workspace)) {
		const context = member.boundedcontext;
		for (const attribute of member.attributes.values()) {
			const vo = attribute.valueobject;
			// A relation may not leave the context, so only ask for one that
			// could exist: a value object reached over a shared kernel is typed
			// by ref alone.
			if (!vo || vo.boundedcontext !== context) continue;
			const candidates = usesOfValueObject(member.allRelations, vo);
			if (candidates.length === 0) {
				diagnostics.push({
					severity: "warning",
					rule: "attribute-relation-coherence",
					message: `"${member.name}" types attribute "${attribute.name}" by value object "${vo.name}" but declares no "uses" relation to "${vo.name}", so the relation map never draws it`,
					ref: member.ref,
				});
				continue;
			}
			const relation =
				candidates.find((r) => r.for === attribute.name) ??
				(candidates.length === 1 ? candidates[0] : undefined);
			if (!relation) {
				diagnostics.push({
					severity: "warning",
					rule: "attribute-relation-coherence",
					message: `"${member.name}" types attribute "${attribute.name}" by value object "${vo.name}", and ${candidates.length} "uses" relations point at "${vo.name}" with none of them declaring \`for: "${attribute.name}"\`; where one value object is used twice each relation names the attribute it draws`,
					ref: member.ref,
				});
				continue;
			}
			diagnostics.push(...cardinalityDiagnostics(member, attribute, relation));
		}
		for (const relation of member.relations) {
			if (relation.relation !== "uses") continue;
			const target = relation.target;
			if (!(target instanceof ValueObject)) continue;
			if (target.boundedcontext !== context) continue;
			const typed = member.allAttributes.filter(
				(a) => a.valueobject === target,
			);
			const siblings = usesOfValueObject(member.allRelations, target);
			const matched = relation.for
				? typed.some((a) => a.name === relation.for)
				: siblings.length === 1 && typed.length > 0;
			if (matched) continue;
			diagnostics.push({
				severity: "warning",
				rule: "attribute-relation-coherence",
				message:
					siblings.length === 1 && !relation.for
						? `"${member.name}" uses "${target.name}" but no attribute of "${member.name}" is typed by "${target.name}", so the page says the relation exists and never shows where`
						: `"${member.name}" uses "${target.name}" ${siblings.length} time${siblings.length === 1 ? "" : "s"} and this relation draws ${relation.for ? `\`for: "${relation.for}"\`` : "no named attribute"}, which is no attribute of "${member.name}" typed by "${target.name}"; where one value object is used twice each relation names the attribute it draws with \`for\``,
				ref: member.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * A relation's `for` names an attribute of the thing that declares the
 * relation.
 *
 * `for` exists to pair one half of a statement with the other, so a `for` that
 * points at nothing pairs nothing: the attribute it names was renamed, or
 * belongs to the target rather than to the source. Inherited attributes count
 * as the subtype's own (decision 22), so a kind may draw an attribute its
 * parent declares.
 */
const relationForResolves: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const member of modelMembersOf(workspace)) {
		for (const relation of member.relations) {
			if (!relation.for) continue;
			if (member.allAttributes.some((a) => a.name === relation.for)) continue;
			diagnostics.push({
				severity: "error",
				rule: "relation-for-resolves",
				message: `"${member.name}" relates to "${relation.target.name}" for attribute "${relation.for}", which is no attribute of "${member.name}"`,
				ref: member.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * An attribute names one shape or none, and which shapes it may name depends
 * on what holds it (decision 18).
 *
 * A value object and a schema are different claims — a value object is a
 * concept of the context's own model, a schema a payload shape at the
 * boundary — so no attribute names both: doing so leaves a reader unable to
 * say which of the two the field really is. And an entity or a value object
 * names only a value object, never a schema: what a domain object holds is
 * part of the model, and reaching for a published payload shape would put the
 * boundary's vocabulary inside the model it exists to protect. Composition
 * with a schema is a schema's own business.
 */
const attributeOneShape: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const { owner } of attributeOwnersOf(workspace)) {
		for (const attribute of owner.attributes.values()) {
			if (attribute.valueobject && attribute.schema) {
				diagnostics.push({
					severity: "error",
					rule: "attribute-one-shape",
					message: `"${owner.name}" types attribute "${attribute.name}" by both value object "${attribute.valueobject.name}" and schema "${attribute.schema.name}"; an attribute has one shape`,
					ref: attribute.ref,
				});
				continue;
			}
			if (attribute.schema && !(owner instanceof DataSchema)) {
				diagnostics.push({
					severity: "error",
					rule: "attribute-one-shape",
					message: `"${owner.name}" types attribute "${attribute.name}" by schema "${attribute.schema.name}", which is a payload shape at the context's boundary; an entity or value object names a value object instead`,
					ref: attribute.ref,
				});
			}
		}
	}
	return diagnostics;
};

/**
 * Where an invariant may reach: the aggregate an element sits in, or the
 * context, for a value object the whole context shares. A schema's attribute
 * sits in neither, so it reports as out of reach; so does a service's
 * operation, since a service is not a boundary anything is saved inside.
 */
function scopeOf(
	target: Constrainable,
): Aggregate | BoundedContext | undefined {
	if (target instanceof Consumable)
		return target.provider instanceof Aggregate ? target.provider : undefined;
	const owner = target instanceof Attribute ? target.owner : target;
	if (owner instanceof Entity) return owner.aggregate;
	if (owner instanceof ValueObject) return owner.boundedcontext;
	return undefined;
}

/**
 * Whether a target is an operation a service of `bc` provides, of either kind.
 *
 * A precondition is checked at the moment of the call, and decision 17 puts
 * the public operation on the application service, so that is often where the
 * check runs: the funds check at initiation, the entitlement check at playback
 * start. A rule that has to read two aggregates before it can say yes lives in
 * a domain service instead, which is what a domain service is for, so both
 * kinds count. The rule guarded is still the aggregate's — it is a rule about
 * what this aggregate may do — so the invariant has to be able to point at the
 * operation that does the guarding rather than leave it in prose (decision 19,
 * second amendment). The service has to be one of the aggregate's own context:
 * reaching into a neighbour's boundary would claim a rule nobody here can keep.
 */
function guardedByService(target: Constrainable, bc: BoundedContext): boolean {
	if (!(target instanceof Consumable)) return false;
	const { provider } = target;
	return (
		target.type === "operation" &&
		!(provider instanceof Aggregate) &&
		provider.boundedcontext === bc
	);
}

/** The value object a target is, or the one whose attribute it is. */
function valueObjectOf(target: Constrainable): ValueObject | undefined {
	const owner = target instanceof Attribute ? target.owner : target;
	return owner instanceof ValueObject ? owner : undefined;
}

/**
 * Every value object something inside `boundary` holds, followed through the
 * values those values hold in turn.
 *
 * An invariant's boundary holds instances, not type definitions. A value
 * object borrowed over a shared kernel or conformed to upstream is defined in
 * the other context and lives inside whichever aggregate holds one, so an
 * invariant of that aggregate may constrain the value and its attributes. A
 * value nobody inside the boundary holds stays out of reach, wherever it is
 * defined (decision 27, card 89).
 */
function valueObjectsHeldIn(
	boundary: Aggregate | BoundedContext,
): Set<ValueObject> {
	const holders: (Entity | ValueObject)[] =
		boundary instanceof Aggregate
			? [...boundary.entities.values()]
			: [...boundary.aggregates.values()].flatMap((a) => [
					...a.entities.values(),
				]);
	const held = new Set<ValueObject>();
	// `holders` grows as values are found, and a `for...of` over an array
	// reads its length each step, so the walk follows nesting to the end.
	for (const holder of holders) {
		for (const attribute of holder.allAttributes) {
			const vo = attribute.valueobject;
			if (!vo || held.has(vo)) continue;
			held.add(vo);
			holders.push(vo);
		}
	}
	return held;
}

/**
 * Every invariant a value object owns, in declaration order, including an
 * external context's: a standard's published rule is checked like any other
 * (decision 28, third amendment).
 */
function* valueObjectInvariantsOf(
	workspace: Workspace,
): Iterable<[ValueObject, Invariant]> {
	for (const bc of workspace.boundedcontexts.values())
		for (const vo of bc.valueobjects.values())
			for (const invariant of vo.invariants.values()) yield [vo, invariant];
}

/**
 * A value object's invariant is a rule about that value and nothing else: a
 * Money's two amounts in one currency, an IBAN's mod-97 checksum. It holds by
 * construction, because a value that breaks it is never made, so it needs no
 * guard and it may not reach for an entity, another value or an operation —
 * anything it reached for would be a rule about something the value cannot
 * see, and that rule belongs to the aggregate or the context (decision 27).
 */
const invariantInValueObject: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const [vo, invariant] of valueObjectInvariantsOf(workspace)) {
		const own = new Set<Constrainable>([vo, ...vo.allAttributes]);
		for (const target of invariant.targets) {
			if (own.has(target)) continue;
			diagnostics.push({
				severity: "error",
				rule: "invariant-in-value-object",
				message: `Invariant "${invariant.name}" of value object "${vo.name}" constrains "${constrainableLabel(target)}", which is not an attribute of "${vo.name}"; a value's rule holds by construction of that value and reaches nothing outside it`,
				ref: invariant.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * An aggregate's invariant holds inside its boundary, so everything it
 * constrains has to be inside that aggregate — or be a value object of the
 * aggregate's own context, which is saved as part of whichever aggregate holds
 * one (decision 16). An operation of the same aggregate is inside it too: a
 * transition rule is a rule about what that operation may do, and naming it is
 * how the model says which change the rule guards (decision 19).
 *
 * Naming one changes what the rule promises, which is why the rule's text and
 * the invariant's page say so. An invariant that names no operation is true
 * again every time the aggregate is saved. One that names an operation is a
 * guard on it: a precondition checked when that operation runs, which nothing
 * re-establishes afterwards, because what it was checked against — a balance, an
 * entitlement, the status it was in — may have moved on by the next save
 * (decision 27's third note). The boundary is the same for both; the promise is
 * not.
 *
 * A value object borrowed from another context is inside the boundary as well,
 * as long as an entity or a value inside the aggregate holds one: what is
 * saved with the aggregate is the value, not the definition, and where the
 * definition lives — this context, a shared kernel, an upstream the context
 * conforms to — says nothing about which aggregate holds an instance. A value
 * nobody inside the aggregate holds is still refused (card 89).
 *
 * The last thing inside is an operation of a service of the same context,
 * application or domain, when that operation is the guard: a precondition is
 * checked at the moment of the call, and decision 17 put the public operation
 * on the application service, while a rule that reads two aggregates before
 * acting lives in a domain service, so the model has to be able to name either
 * (see {@link guardedByService}).
 */
const invariantInAggregate: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of aggregatesOf(workspace)) {
		if (aggregate.invariants.size === 0) continue;
		const held = valueObjectsHeldIn(aggregate);
		for (const invariant of aggregate.invariants.values()) {
			for (const target of invariant.targets) {
				const scope = scopeOf(target);
				if (scope === aggregate || scope === aggregate.boundedcontext) continue;
				if (guardedByService(target, aggregate.boundedcontext)) continue;
				const vo = valueObjectOf(target);
				if (vo && held.has(vo)) continue;
				const service =
					target instanceof Consumable &&
					!(target.provider instanceof Aggregate)
						? target.provider
						: undefined;
				const where = vo
					? `a value object of bounded context "${vo.boundedcontext.name}" that nothing in "${aggregate.name}" holds`
					: service
						? `${service.type === "application" ? "an application" : "a domain"} service's, on "${service.name}" in bounded context "${service.boundedcontext.name}"`
						: `in ${
								scope
									? `${scope instanceof Aggregate ? "aggregate" : "bounded context"} "${scope.name}"`
									: "no aggregate at all"
							}`;
				diagnostics.push({
					severity: "error",
					rule: "invariant-in-aggregate",
					message: `Invariant "${invariant.name}" of aggregate "${aggregate.name}" constrains "${constrainableLabel(target)}", which is ${where}; an aggregate's invariant holds inside the boundary on every save, and the only thing outside it may name is an operation of a service of its own context that guards it`,
					ref: invariant.ref,
				});
			}
		}
	}
	return diagnostics;
};

/** Every invariant a bounded context owns, in declaration order. */
function* contextInvariantsOf(
	workspace: Workspace,
): Iterable<[BoundedContext, Invariant]> {
	for (const bc of modelledContexts(workspace))
		for (const invariant of bc.invariants.values()) yield [bc, invariant];
}

/**
 * The context an element belongs to, for a rule the context keeps rather than
 * one aggregate (decision 27). A schema's attribute belongs to the boundary
 * rather than the model, so it reports as out of reach the way it does for an
 * aggregate's invariant.
 */
function contextOf(target: Constrainable): BoundedContext | undefined {
	if (target instanceof Consumable) return target.boundedcontext;
	const owner = target instanceof Attribute ? target.owner : target;
	if (owner instanceof Entity) return owner.aggregate.boundedcontext;
	if (owner instanceof ValueObject) return owner.boundedcontext;
	return undefined;
}

/**
 * A context's invariant reaches across its own aggregates and no further:
 * uniqueness, a quota, a limit are rules about that context's own instances,
 * and a rule that names another context's model claims a consistency no
 * boundary offers (decision 27).
 *
 * As for an aggregate, a value object one of the context's own aggregates
 * holds is inside the boundary wherever it is defined, so a rule counting a
 * shared `Money`'s amount across instances is the context's to keep; a value
 * nobody in the context holds is refused (card 89).
 */
const invariantInContext: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	const heldIn = new Map<BoundedContext, Set<ValueObject>>();
	for (const [bc, invariant] of contextInvariantsOf(workspace)) {
		let held = heldIn.get(bc);
		if (!held) {
			held = valueObjectsHeldIn(bc);
			heldIn.set(bc, held);
		}
		for (const target of invariant.targets) {
			const context = contextOf(target);
			if (context === bc) continue;
			const vo = valueObjectOf(target);
			if (vo && held.has(vo)) continue;
			const where = vo
				? `a value object of bounded context "${vo.boundedcontext.name}" that nothing in "${bc.name}" holds`
				: `in ${context ? `bounded context "${context.name}"` : "no bounded context at all"}`;
			diagnostics.push({
				severity: "error",
				rule: "invariant-in-context",
				message: `Invariant "${invariant.name}" of bounded context "${bc.name}" constrains "${constrainableLabel(target)}", which is ${where}; a context's invariant holds across its own aggregates and no further`,
				ref: invariant.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * A rule no single instance can see is kept true only by whoever checks it
 * before acting, so a context's invariant names the operation that does the
 * checking. Without one the model states a rule and says nothing about where
 * it is upheld (decision 27).
 */
const contextInvariantGuarded: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const [bc, invariant] of contextInvariantsOf(workspace)) {
		const guards = invariant.guarded.filter(
			(it) => it.type === "operation" && it.boundedcontext === bc,
		);
		if (guards.length > 0) continue;
		diagnostics.push({
			severity: "error",
			rule: "context-invariant-guarded",
			message: `Invariant "${invariant.name}" of bounded context "${bc.name}" names no operation that guards it; a rule across instances is kept true by whoever checks it before acting`,
			ref: invariant.ref,
		});
	}
	return diagnostics;
};

/** Whether the two contexts declare a shared kernel with one another. */
function sharesKernelWith(
	workspace: Workspace,
	one: BoundedContext,
	other: BoundedContext,
): boolean {
	return workspace.relationships.some(
		(r) => r.type === "shared-kernel" && r.involves(one) && r.involves(other),
	);
}

/**
 * Whether `downstream` has declared itself a conformist of `upstream`: a
 * directed relationship from the one to the other whose `downstreamRoles`
 * carry `conformist` (decision 03).
 *
 * The direction is the whole of it. A conformist adopts the upstream's model
 * as it stands rather than translating it, so the borrowing runs downstream
 * from upstream and never the other way: the upstream owes the conformist
 * nothing and must not be shaped by it.
 */
function conformsTo(
	workspace: Workspace,
	downstream: BoundedContext,
	upstream: BoundedContext,
): boolean {
	return workspace.relationships.some(
		(r) =>
			isDirectedRelationshipType(r.type) &&
			r.source === upstream &&
			r.target === downstream &&
			r.downstreamRoles.includes("conformist"),
	);
}

/**
 * Whether `borrower` may name a schema or a value object that `owner`
 * declares. Two contexts keeping part of one model between them is a shared
 * kernel, which is symmetric; a downstream that has said it conforms is the
 * other case, and it is one-way (decisions 16 and 03). Everything else stays
 * sealed.
 */
function mayBorrowFrom(
	workspace: Workspace,
	borrower: BoundedContext,
	owner: BoundedContext,
): boolean {
	return (
		sharesKernelWith(workspace, borrower, owner) ||
		conformsTo(workspace, borrower, owner)
	);
}

/** One attribute typing itself by a value object another context declares. */
type ValueObjectBorrowing = {
	/** The attribute that names the other context's value. */
	attribute: Attribute;
	/** What it names: the value object, and through it the context that owns it. */
	valueobject: ValueObject;
	/** The context the attribute is declared in, and so the borrower. */
	from: BoundedContext;
};

/**
 * Every attribute in the workspace typed by a value object of another context.
 *
 * A borrowed value is the same crossing a borrowed schema is: this context's
 * model is written in a word another context owns, and it breaks when that
 * context redefines it. Both ends are read the same way whatever holds the
 * attribute — an entity, a value, a payload schema — because what is borrowed
 * is the definition rather than an instance, and a payload naming a foreign
 * value depends on it exactly as an entity does (decision 16).
 */
function* valueObjectBorrowings(
	workspace: Workspace,
): Iterable<ValueObjectBorrowing> {
	for (const { owner, context } of attributeOwnersOf(workspace)) {
		for (const attribute of owner.attributes.values()) {
			const valueobject = attribute.valueobject;
			if (!valueobject || valueobject.boundedcontext === context) continue;
			yield { attribute, valueobject, from: context };
		}
	}
}

/** Whether the two contexts meet as equals, as partners or over a shared kernel. */
function symmetricallyRelated(
	workspace: Workspace,
	one: BoundedContext,
	other: BoundedContext,
): boolean {
	return workspace.relationships.some(
		(r) =>
			(r.type === "partnership" || r.type === "shared-kernel") &&
			r.involves(one) &&
			r.involves(other),
	);
}

/**
 * Whether a relationship accounts for a crossing running from `upstream` to
 * `downstream`.
 *
 * A partnership or a shared kernel counts either way round: the two contexts
 * meet as equals, so there is no direction to get wrong. A directed
 * relationship counts only the way it points — a crossing running against it
 * is a second dependency the map has never been told about. Separate ways
 * counts for nothing: it is the declaration that the two do *not* integrate,
 * so it contradicts the crossing rather than explaining it.
 */
function relationshipJoins(
	workspace: Workspace,
	upstream: BoundedContext,
	downstream: BoundedContext,
): boolean {
	return workspace.relationships.some((r) =>
		isDirectedRelationshipType(r.type)
			? r.source === upstream && r.target === downstream
			: (r.type === "partnership" || r.type === "shared-kernel") &&
				r.involves(upstream) &&
				r.involves(downstream),
	);
}

/**
 * Every crossing between two contexts has a relationship saying how they
 * stand to each other.
 *
 * Decision 03 made relationships explicit and decision 08 promised this rule.
 * A crossing is a consumption of another context's consumable, a policy or a
 * process reacting to another context's event or to the answer one of its
 * operations comes back with, an identity an entity or a value object holds
 * that names another context's entity (decision 14), or an attribute typed by
 * another context's value object (decision 16): the ways the model records
 * that one context depends on another. An identity echoed in a payload is not
 * one of them: the schema carries it for its reader and owes the other context
 * nothing (decision 14, second amendment). A borrowed value object is, because
 * what is borrowed there is the definition and not an instance.
 *
 * A subscription counts for the same reason `separate-ways` and
 * `partnership-backed` count one; the coupling is real whether it is written as
 * a consumption or reached through a policy. The map does not draw a
 * subscription — it reads consumptions and identities — but it does not have
 * to, because `subscription-consumed` makes the consumption exist, and it is
 * that consumption the map draws. What is missing here is the answer to the
 * question the edge raises, which is on what terms.
 *
 * One diagnostic per undeclared pair and direction, not per crossing: one
 * relationship is what would clear them all, so one warning is what a reader
 * can act on.
 */
const relationshipDeclared: Rule = (workspace) => {
	const missing = new Map<string, Diagnostic>();
	const note = (
		upstream: BoundedContext,
		downstream: BoundedContext,
		message: string,
		ref: string,
	) => {
		const key = `${upstream.ref}|${downstream.ref}`;
		if (missing.has(key) || relationshipJoins(workspace, upstream, downstream))
			return;
		missing.set(key, {
			severity: "warning",
			rule: "relationship-declared",
			message,
			ref,
		});
	};

	for (const consumption of consumptionsOf(workspace)) {
		const upstream = consumption.consumable.provider.boundedcontext;
		const downstream = consumption.consumer.boundedcontext;
		if (upstream === downstream) continue;
		note(
			upstream,
			downstream,
			`"${downstream.name}" consumes "${consumption.consumable.name}" from "${upstream.name}", but no relationship says how "${upstream.name}" and "${downstream.name}" stand to each other`,
			consumption.consumer.ref,
		);
	}
	for (const crossing of identityCrossings([
		...workspace.boundedcontexts.values(),
	])) {
		// An identity naming an external context names no entity, because that
		// system's entities are not ours to state (decision 28); the crossing is
		// the same one either way, so only the phrase changes.
		const what =
			crossing.target instanceof BoundedContext
				? `an id belonging to "${crossing.to.name}"`
				: `the identity of "${crossing.target.name}" in "${crossing.to.name}"`;
		note(
			crossing.to,
			crossing.from,
			`"${crossing.from.name}" holds "${crossing.attribute.name}", ${what}, but no relationship says how "${crossing.to.name}" and "${crossing.from.name}" stand to each other`,
			crossing.attribute.ref,
		);
	}
	for (const { attribute, valueobject, from } of valueObjectBorrowings(
		workspace,
	)) {
		const owner = valueobject.boundedcontext;
		note(
			owner,
			from,
			`"${from.name}" types "${attribute.owner.name}"'s "${attribute.name}" by "${valueobject.name}" from "${owner.name}", but no relationship says how "${owner.name}" and "${from.name}" stand to each other`,
			attribute.ref,
		);
	}
	// A policy or a process reacting to another context's event, or waiting on
	// the answer another context's operation comes back with, is the same
	// dependency as a consumption — `separate-ways` and `partnership-backed`
	// both already count it — so it wants a relationship for the same reason.
	// Last, because it is the crossing a reader is least likely to have in mind
	// and a pair joined by something more concrete is better named by that.
	for (const bc of workspace.boundedcontexts.values()) {
		for (const reactor of reactorsOf(bc)) {
			for (const trigger of subscribedTriggers(reactor)) {
				const upstream =
					trigger instanceof DataSchema
						? trigger.boundedcontext
						: trigger.provider.boundedcontext;
				if (upstream === bc) continue;
				const what =
					trigger instanceof DataSchema
						? `waits for "${trigger.name}" to come back from`
						: `reacts to "${trigger.name}" from`;
				note(
					upstream,
					bc,
					`${reactorLabel(reactor)} "${reactor.name}" in "${bc.name}" ${what} "${upstream.name}", but no relationship says how "${upstream.name}" and "${bc.name}" stand to each other`,
					reactor.ref,
				);
			}
		}
	}
	return [...missing.values()];
};

/**
 * What two relationships collide on: the type and, for a directed type, the
 * order of the pair. A symmetric type has no direction, so participants either
 * way round are the same relationship declared twice.
 */
function relationshipKey(relationship: ContextRelationship): string {
	const { source, target, type } = relationship;
	const ends = isDirectedRelationshipType(type)
		? [source.id, target.id]
		: [source.id, target.id].sort();
	return `${ends[0]}~${type}~${ends[1]}`;
}

/**
 * One relationship per type and direction between a pair of contexts.
 *
 * A relationship is the one model element with no id of its own: its ref is
 * the two contexts and the type. Declare the same one twice and the two share
 * a ref, so the second is unreachable — nothing can link to it, and a comment
 * or a disposition on it is written where no reader will ever land. It is an
 * error rather than a warning because the model has lost information the
 * moment it is written.
 */
const relationshipDuplicate: Rule = (workspace) => {
	const seen = new Set<string>();
	const diagnostics: Diagnostic[] = [];
	for (const relationship of workspace.relationships) {
		const key = relationshipKey(relationship);
		if (!seen.has(key)) {
			seen.add(key);
			continue;
		}
		const { source, target, type } = relationship;
		diagnostics.push({
			severity: "error",
			rule: "relationship-duplicate",
			message: `"${source.name}" and "${target.name}" declare a ${type} relationship more than once; the two share a ref, so only the first can be reached and everything said on this one is lost`,
			ref: relationship.ref,
		});
	}
	return diagnostics;
};

/** Consumables and consumptions declare roles that fit their type. */
const roleCoherence: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const consumption of consumptionsOf(workspace)) {
		const { consumable } = consumption;
		const provider = consumable.provider.boundedcontext;
		const consumer = consumption.consumer.boundedcontext;
		if (provider === consumer) continue;
		// Partners and shared-kernel contexts have no upstream or downstream
		// side, so neither end of the exchange carries a role to declare.
		if (symmetricallyRelated(workspace, provider, consumer)) continue;
		if (!consumable.pattern && !consumable.internal) {
			diagnostics.push({
				severity: "warning",
				rule: "role-coherence",
				message: `"${consumable.name}" is consumed from another context but declares no upstream role (open-host-service or published-language)`,
				ref: consumable.ref,
			});
		}
		if (!consumption.pattern) {
			diagnostics.push({
				severity: "warning",
				rule: "role-coherence",
				message: `"${consumption.consumer.name}" consumes "${consumable.name}" from another context without a downstream role (conformist or anti-corruption-layer)`,
				ref: consumption.ref,
			});
		}
	}
	return diagnostics;
};

/** Every consumption in which `to` consumes something `from` provides. */
function crossingsBetween(
	workspace: Workspace,
	from: BoundedContext,
	to: BoundedContext,
): Consumption[] {
	return Array.from(consumptionsOf(workspace)).filter(
		(c) =>
			c.consumable.provider.boundedcontext === from &&
			c.consumer.boundedcontext === to,
	);
}

/**
 * Whether a crossing consumable carries an upstream role. A published language
 * is a data shape, not a second flag, so any crossing consumable with a
 * `schema` publishes one: an open-host-service operation with a schema backs
 * both roles at once.
 */
function carriesUpstreamRole(
	consumable: Consumable,
	role: UpstreamRole,
): boolean {
	if (consumable.pattern === role) return true;
	return role === "published-language" && consumable.schema !== undefined;
}

/**
 * The roles a directed relationship claims are the roles its traffic actually
 * carries, in both directions: every declared role is backed by a crossing,
 * and every crossing consumption's role is declared on the relationship.
 *
 * Conformist is the one role that is not only about traffic. Adopting the
 * upstream's model as it stands is exactly what carrying its schemas and value
 * objects is, and it is what the role warrants (`schema-context`,
 * `specialisation-in-boundary`), so a downstream that borrows one is a
 * conformist whether or not it consumes anything: a context conforming to a
 * standards body's message formats — FHIR, ISO 20022, a scheme's record layout
 * — often takes the shapes and sends over a pipe the model does not draw.
 * `borrowsFrom` is the predicate `conformist-backed` reads for the same reason,
 * so the two rules answer the borrowing question the same way rather than one
 * accepting what the other warns about (card 90).
 */
const relationshipRolesBacked: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const relationship of workspace.relationships) {
		if (!isDirectedRelationshipType(relationship.type)) continue;
		const upstream = relationship.source;
		const downstream = relationship.target;
		const crossings = crossingsBetween(workspace, upstream, downstream);
		for (const role of relationship.upstreamRoles) {
			if (crossings.some((c) => carriesUpstreamRole(c.consumable, role)))
				continue;
			diagnostics.push({
				severity: "warning",
				rule: "relationship-roles-backed",
				message: `"${upstream.name}" is declared ${role} to "${downstream.name}", but nothing "${downstream.name}" consumes from "${upstream.name}" carries that upstream role`,
				ref: relationship.ref,
			});
		}
		for (const role of relationship.downstreamRoles) {
			if (crossings.some((c) => c.pattern === role)) continue;
			if (role === "conformist" && borrowsFrom(downstream, upstream)) continue;
			const alsoBorrows =
				role === "conformist"
					? `, and nothing in it carries one of "${upstream.name}"'s schemas or value objects`
					: "";
			diagnostics.push({
				severity: "warning",
				rule: "relationship-roles-backed",
				message: `"${downstream.name}" is declared ${role} to "${upstream.name}", but no consumption of "${downstream.name}" from "${upstream.name}" declares that downstream role${alsoBorrows}`,
				ref: relationship.ref,
			});
		}
		for (const crossing of crossings) {
			if (!crossing.pattern) continue;
			if (relationship.downstreamRoles.includes(crossing.pattern)) continue;
			diagnostics.push({
				severity: "warning",
				rule: "relationship-roles-backed",
				message: `"${crossing.consumer.name}" consumes "${crossing.consumable.name}" from "${upstream.name}" as ${crossing.pattern}, a downstream role the ${relationship.type} relationship between "${upstream.name}" and "${downstream.name}" does not declare`,
				ref: crossing.consumer.ref,
			});
		}
	}
	return diagnostics;
};

/** Whether the downstream context calls an operation the upstream one offers. */
function callCrosses(
	workspace: Workspace,
	upstream: BoundedContext,
	downstream: BoundedContext,
): boolean {
	return crossingsBetween(workspace, upstream, downstream).some(
		(c) => c.consumable.type === "operation",
	);
}

/**
 * Whether this relationship's downstream has declared an anti-corruption
 * layer toward its upstream. An ACL is a translation the downstream owns: the
 * upstream's contract stops at it, and the model behind it is free to change
 * on its own schedule, which is the whole reason the pattern exists. A step
 * through one therefore does not bind the two models together and does not
 * count toward a ring (decision 20's 2026-09-08 amendment).
 */
function translatedByAcl(relationship: ContextRelationship): boolean {
	return relationship.downstreamRoles.includes("anti-corruption-layer");
}

/**
 * The directed relationships whose traffic is calls form no cycle.
 *
 * Upstream and downstream is a statement about models: the downstream context
 * shapes its own model around what the upstream offers, and a ring of those
 * means the contexts on it depend on each other's contracts. Two things do not
 * count as a step (decision 20). A step carried only by events, or by a policy
 * subscribing to the other side's event, is choreography, and rings of those
 * are `reaction-cycle`'s business. And a step whose downstream translates
 * behind an anti-corruption layer is not a ring either: the ACL is exactly
 * what lets the two models evolve independently, so a pair that calls each
 * other through one is not stuck. What is left is the honest case: contexts
 * calling each other with nothing between them.
 */
const relationshipCycle: Rule = (workspace) => {
	// The contexts are the nodes, so every ring found is a ring of distinct
	// contexts. Walking the relationships instead would also report the longer
	// closed walks that thread the same context twice, which say nothing new.
	const startingAt = new Map<BoundedContext, ContextRelationship[]>();
	for (const relationship of workspace.relationships) {
		if (!isDirectedRelationshipType(relationship.type)) continue;
		if (translatedByAcl(relationship)) continue;
		if (!callCrosses(workspace, relationship.source, relationship.target))
			continue;
		append(startingAt, relationship.source, relationship);
	}

	return cyclesOf(
		workspace.boundedcontexts.values(),
		(context) => (startingAt.get(context) ?? []).map((r) => r.target),
		(context) => context.id,
	).flatMap((ring) => {
		// The ring reports at a relationship on it rather than at a context, so a
		// reader lands on something they can edit. There is one by construction —
		// the ring was walked along it — and the guard just keeps that honest.
		const next = ring.length === 1 ? ring[0] : ring[1];
		const link = (startingAt.get(ring[0]) ?? []).find((r) => r.target === next);
		if (!link) return [];
		return [
			{
				severity: "warning" as const,
				rule: "relationship-cycle",
				message: `Calls run in a cycle: ${[...ring, ring[0]]
					.map((c) => `"${c.name}"`)
					.join(
						" -> ",
					)}; each of these contexts calls the next, so all of them depend on each other's contracts. Put an anti-corruption layer on one of the steps, so that side translates and is free to change; or declare a partnership where two of them really do move as one; or reverse a dependency by turning that call into an event the other side reacts to`,
				ref: link.ref,
			},
		];
	});
};

/** Every attribute a context declares, wherever it hangs. */
function* attributesOf(bc: BoundedContext): Iterable<Attribute> {
	for (const owner of attributeOwnersIn(bc)) yield* owner.attributes.values();
}

/**
 * Whether anything in `borrower` is typed by a value object `owner` declares,
 * nests one of its schemas, or carries one on a consumable: the ways a kernel
 * is shared.
 */
function borrowsFrom(borrower: BoundedContext, owner: BoundedContext): boolean {
	for (const attribute of attributesOf(borrower)) {
		if (attribute.valueobject?.boundedcontext === owner) return true;
		if (attribute.schema?.boundedcontext === owner) return true;
	}
	for (const p of [
		...borrower.aggregates.values(),
		...borrower.services.values(),
	]) {
		for (const c of p.consumables.values()) {
			if (c.schema?.boundedcontext === owner) return true;
			if (c.returns?.boundedcontext === owner) return true;
		}
	}
	return false;
}

/**
 * A shared kernel is a piece of model two teams keep in step, and the price is
 * that neither can change it alone. Declaring one with nothing actually shared
 * pays that price for nothing, and it also lets the pair through the checks
 * that seal a context: a shared kernel is the one relationship over which a
 * value object or a schema may be borrowed, so a reader takes it as the
 * warrant for a sharing that here does not exist.
 *
 * A kernel is not only shapes. Evans's shared kernel is a bounded subset of
 * model and code two teams own together, and anything with identity and
 * behaviour in it — a jointly maintained Product with its unit conversions — is
 * an aggregate of a kernel context both sides reach through its operations, not
 * a value object either side can copy. Calling one of the kernel's operations
 * is that sharing, and it counts here (decision 16, second amendment; card 90).
 */
const sharedKernelBacked: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const relationship of workspace.relationships) {
		if (relationship.type !== "shared-kernel") continue;
		const { source, target } = relationship;
		if (borrowsFrom(source, target) || borrowsFrom(target, source)) continue;
		if (
			callCrosses(workspace, source, target) ||
			callCrosses(workspace, target, source)
		)
			continue;
		diagnostics.push({
			severity: "warning",
			rule: "shared-kernel-backed",
			message: `"${source.name}" and "${target.name}" declare a shared kernel, but neither types an attribute by a value object the other declares, carries one of its schemas or calls one of its operations, so nothing is in the kernel`,
			ref: relationship.ref,
		});
	}
	return diagnostics;
};

/**
 * Whether `downstream` takes any of `upstream`'s shapes as they stand.
 *
 * Three things count, and they are the three ways the model can record it.
 * The downstream names one of the upstream's schemas or value objects on
 * something of its own, which is `borrowsFrom` and is the borrowing the
 * conformist role now warrants. It consumes something the upstream publishes
 * that carries one of the upstream's schemas, which is taking a published
 * language as published — the ordinary shape of an event-driven conformist,
 * and the one the reference models are full of. Or it calls one of the
 * upstream's operations, which is conforming to an interface that may carry
 * no schema at all.
 */
function conformsInSubstance(
	workspace: Workspace,
	downstream: BoundedContext,
	upstream: BoundedContext,
): boolean {
	if (borrowsFrom(downstream, upstream)) return true;
	if (callCrosses(workspace, upstream, downstream)) return true;
	return crossingsBetween(workspace, upstream, downstream).some(
		(c) => c.consumable.schema?.boundedcontext === upstream,
	);
}

/**
 * A declared conformist actually takes something from its upstream.
 *
 * Conformist is the strongest thing a downstream can say about itself: it
 * gives up its own language for somebody else's and accepts every change the
 * upstream makes. It is also what lets this context name the upstream's
 * schemas and value objects at all, so a reader takes the role as the warrant
 * for exactly the borrowing `schema-context` and `specialisation-in-boundary`
 * allow over it. Declared between two contexts that exchange nothing, it is a
 * claim on the map with nothing under it, in the way `partnership-backed` and
 * `shared-kernel-backed` mean.
 *
 * What the rule does not ask is that the conforming be visible in the shapes.
 * Whether a downstream that subscribes to a published event translates it or
 * takes it as it comes is not in the model and was never meant to be
 * (decision 15), so demanding a borrowed schema here would report every
 * event-driven conformist there is.
 */
const conformistBacked: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const relationship of workspace.relationships) {
		if (!isDirectedRelationshipType(relationship.type)) continue;
		if (!relationship.downstreamRoles.includes("conformist")) continue;
		const upstream = relationship.source;
		const downstream = relationship.target;
		if (conformsInSubstance(workspace, downstream, upstream)) continue;
		diagnostics.push({
			severity: "warning",
			rule: "conformist-backed",
			message: `"${downstream.name}" declares itself a conformist of "${upstream.name}", but it names none of "${upstream.name}"'s schemas or value objects, consumes nothing it publishes and calls none of its operations, so there is nothing here to conform to`,
			ref: relationship.ref,
		});
	}
	return diagnostics;
};

/** Whether anything of `from`'s crosses into `to`, as traffic or as a subscription. */
function trafficCrosses(
	workspace: Workspace,
	from: BoundedContext,
	to: BoundedContext,
): boolean {
	if (crossingsBetween(workspace, from, to).length > 0) return true;
	// A policy or a process subscribing to another context's event is the same
	// exchange as a consumption, so it backs the partnership just as well.
	for (const reactor of reactorsOf(to)) {
		for (const event of subscribedEvents(reactor)) {
			if (event.provider.boundedcontext === from) return true;
		}
	}
	return false;
}

/**
 * A partnership is backed by traffic in at least one direction.
 *
 * A partnership is two teams whose success depends on each other's and who
 * plan and release as one. That is a fact about how they work, not about the
 * shape of the arrows: one team may consume everything and the other nothing
 * and the joint release train still be real, so the rule does not demand the
 * quiet direction — decision 20's second amendment, after the rule was found
 * over-claiming on two reference models. What it does demand is that
 * something crosses. A partnership with no exchange at all in either
 * direction is a wish: nothing binds the two release trains together, and the
 * relationship is a claim on the map with nothing under it.
 */
const partnershipBacked: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const relationship of workspace.relationships) {
		if (relationship.type !== "partnership") continue;
		const { source, target } = relationship;
		if (
			trafficCrosses(workspace, source, target) ||
			trafficCrosses(workspace, target, source)
		)
			continue;
		diagnostics.push({
			severity: "warning",
			rule: "partnership-backed",
			message: `"${source.name}" and "${target.name}" are declared partners, but nothing crosses between them in either direction; a partnership does not need traffic both ways — one team may consume everything and the other nothing and still share a release train — but with no exchange at all there is nothing holding the two together`,
			ref: relationship.ref,
		});
	}
	return diagnostics;
};

/**
 * Nothing conforms to a big ball of mud. A consumption out of one is
 * translated behind an anti-corruption layer or the mess spreads.
 */
const mudNeedsAcl: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const consumption of consumptionsOf(workspace)) {
		const provider = consumption.consumable.provider.boundedcontext;
		const consumer = consumption.consumer.boundedcontext;
		if (provider === consumer || !provider.bigBallOfMud) continue;
		if (consumption.pattern === "anti-corruption-layer") continue;
		const how = consumption.pattern
			? "as a conformist"
			: "without declaring a downstream role";
		diagnostics.push({
			severity: "warning",
			rule: "mud-needs-acl",
			message: `"${consumer.name}" consumes "${consumption.consumable.name}" from "${provider.name}" ${how}, and "${provider.name}" is a big ball of mud; translate it behind an anti-corruption layer so its model stays out of "${consumer.name}"`,
			ref: consumption.ref,
		});
	}
	return diagnostics;
};

/** A glossary term names the ubiquitous language of one context: its own. */
const termInContext: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		for (const term of bc.glossary.values()) {
			const embodiment = term.embodiedBy;
			if (!embodiment) continue;
			if (
				embodiment.ref === bc.ref ||
				embodiment.ref.startsWith(`${bc.ref}/`)
			) {
				continue;
			}
			diagnostics.push({
				severity: "error",
				rule: "term-in-context",
				message: `Glossary term "${term.name}" of "${bc.name}" is embodied by "${embodiment.name}", which is not part of "${bc.name}"; a term belongs to the language of one context, and the same word means something else next door`,
				ref: term.ref,
			});
		}
	}
	return diagnostics;
};

/** Contexts that have declared separate ways must not exchange consumables. */
const separateWays: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	const separateWaysRelationships = workspace.relationships.filter(
		(r) => r.type === "separate-ways",
	);
	for (const consumption of consumptionsOf(workspace)) {
		const providerContext = consumption.consumable.provider.boundedcontext;
		const consumerContext = consumption.consumer.boundedcontext;
		const declaredApart = separateWaysRelationships.some(
			(r) =>
				r.involves(providerContext) &&
				r.involves(consumerContext) &&
				providerContext !== consumerContext,
		);
		if (declaredApart) {
			diagnostics.push({
				severity: "error",
				rule: "separate-ways",
				message: `"${consumerContext.name}" consumes "${consumption.consumable.name}" from "${providerContext.name}" although the contexts declare separate ways`,
				ref: consumption.consumer.ref,
			});
		}
	}
	// A policy or a process subscribing to another context's event is the same
	// exchange as a consumption, so separate ways rules it out too.
	for (const bc of workspace.boundedcontexts.values()) {
		for (const reactor of reactorsOf(bc)) {
			for (const event of subscribedEvents(reactor)) {
				const providerContext = event.provider.boundedcontext;
				if (providerContext === bc) continue;
				const declaredApart = separateWaysRelationships.some(
					(r) => r.involves(providerContext) && r.involves(bc),
				);
				if (!declaredApart) continue;
				diagnostics.push({
					severity: "error",
					rule: "separate-ways",
					message: `${reactorLabel(reactor)} "${reactor.name}" in "${bc.name}" reacts to "${event.name}" from "${providerContext.name}" although the contexts declare separate ways`,
					ref: reactor.ref,
				});
			}
		}
	}
	return diagnostics;
};

/** An internal consumable never leaves its context. */
const internalConsumable: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const consumption of consumptionsOf(workspace)) {
		const { consumable, consumer } = consumption;
		if (
			consumable.internal &&
			consumable.provider.boundedcontext !== consumer.boundedcontext
		) {
			diagnostics.push({
				severity: "error",
				rule: "internal-consumable",
				message: `"${consumer.name}" consumes "${consumable.name}" from "${consumable.provider.boundedcontext.name}", but it is internal to that context`,
				ref: consumer.ref,
			});
		}
	}
	for (const bc of workspace.boundedcontexts.values()) {
		for (const reactor of reactorsOf(bc)) {
			for (const event of subscribedEvents(reactor)) {
				if (event.internal && event.provider.boundedcontext !== bc) {
					diagnostics.push({
						severity: "error",
						rule: "internal-consumable",
						message: `${reactorLabel(reactor)} "${reactor.name}" reacts to "${event.name}", which is internal to "${event.provider.boundedcontext.name}"`,
						ref: reactor.ref,
					});
				}
			}
			for (const command of reactor.commands) {
				if (command.internal && command.provider.boundedcontext !== bc) {
					diagnostics.push({
						severity: "error",
						rule: "internal-consumable",
						message: `${reactorLabel(reactor)} "${reactor.name}" issues "${command.name}", which is internal to "${command.provider.boundedcontext.name}"`,
						ref: reactor.ref,
					});
				}
			}
		}
	}
	return diagnostics;
};

/**
 * One consumer takes one consumable once, unless each of the consumptions says
 * which of the consumer's callers makes it and no two of them say the same.
 *
 * One pair may carry several exchanges: an archive takes a provider's response
 * as it stands while a decision translates the same response through an
 * anti-corruption layer, each with its own pattern and disposition, and the
 * model has nowhere else to put that. What it may not do is leave the two
 * indistinguishable. A consumption has no id of its own — its ref is the pair
 * it joins, plus the first caller in `by` where the pair repeats (decision 26)
 * — so the callers are what tell repeated consumptions apart: absent, or
 * shared between two of them, the second consumption is unreachable, its
 * pattern, comments and disposition written where nothing can link to them,
 * and every surface keyed by the ref has two rows claiming one key. Card 73
 * met that as a Svelte `each_key_duplicate` crash on the pages render rather
 * than a diagnostic telling the author what was wrong. An error, because the
 * model has lost information the moment it is written.
 */
const consumptionOnce: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	const pairs = new Map<string, Consumption[]>();
	for (const consumption of consumptionsOf(workspace)) {
		const key = `${consumption.consumer.ref} ${consumption.consumable.ref}`;
		const pair = pairs.get(key);
		if (pair) pair.push(consumption);
		else pairs.set(key, [consumption]);
	}
	for (const pair of pairs.values()) {
		if (pair.length < 2) continue;
		const callers = new Map<ConsumptionCaller, Consumption>();
		for (const consumption of pair) {
			const { consumer, consumable } = consumption;
			const takes = `"${consumer.name}" consumes "${consumable.name}" from "${consumable.provider.name}" ${pair.length} times`;
			const report = (says: string) =>
				diagnostics.push({
					severity: "error" as const,
					rule: "consumption-once",
					message: `${takes}, and ${says}; where one consumer takes one consumable more than once, each of those consumptions names the callers that make it and no two of them name the same caller`,
					ref: consumption.ref,
				});
			if (consumption.by.length === 0) {
				report("one of them names no caller in `by`");
				continue;
			}
			for (const caller of consumption.by) {
				if (callers.has(caller)) report(`"${caller.name}" makes more than one`);
				else callers.set(caller, consumption);
			}
		}
	}
	return diagnostics;
};

/**
 * A consumption belongs to the consumer, so the operations named behind it are
 * the consumer's own: what it does with a dependency is its business, and no
 * node gets to say that someone else's operation calls out on its behalf. A
 * policy or a process may be named too, because both are how its context
 * reacts, but each has to belong to that same context (decisions 21 and 23).
 */
const consumptionByResolves: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const consumption of consumptionsOf(workspace)) {
		const { consumer } = consumption;
		for (const caller of consumption.by) {
			const wrong =
				caller instanceof Consumable
					? caller.provider !== consumer &&
						`"${caller.name}" is provided by "${caller.provider.name}"`
					: caller.boundedcontext !== consumer.boundedcontext &&
						`${reactorLabel(caller).toLowerCase()} "${caller.name}" belongs to "${caller.boundedcontext.name}"`;
			if (wrong) {
				diagnostics.push({
					severity: "error",
					rule: "consumption-by-resolves",
					message: `"${consumer.name}" says its consumption of "${consumption.consumable.name}" is made by ${wrong}; a consumption names the consumer's own operations, or the policies and processes of its context`,
					ref: consumption.ref,
				});
				continue;
			}
			if (caller instanceof Consumable && caller.type !== "operation") {
				diagnostics.push({
					severity: "error",
					rule: "consumption-by-resolves",
					message: `"${consumer.name}" says its consumption of "${consumption.consumable.name}" is made by the event "${caller.name}"; an event is something that has happened, so it calls nothing`,
					ref: consumption.ref,
				});
			}
		}
	}
	return diagnostics;
};

/**
 * What makes a call is an operation.
 *
 * A policy or a process is allowed in a `by` because reacting to a published
 * fact is the commonest reason a consumption exists (decision 21): a
 * subscription is taken in by the reactor itself, and there is nothing between
 * the fact arriving and the reaction. A call is not like that. A reactor issues
 * an operation of its own context and that operation makes the call, which is
 * decision 17's whole shape and the step the reaction walk and the flow map
 * read the boundary at. Naming the reactor instead skips the step: the model
 * says a policy reached across a boundary, no local operation exists to be
 * drawn, and the chain stops where the caller should have been. Petstore relied
 * on it for a card and a half.
 *
 * An error, because the two are not two ways of saying one thing: the reader is
 * told about a call by a thing that makes none.
 */
const consumptionByOperation: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const consumption of consumptionsOf(workspace)) {
		const { consumer, consumable } = consumption;
		if (consumable.type !== "operation") continue;
		for (const caller of consumption.by) {
			if (caller instanceof Consumable) continue;
			diagnostics.push({
				severity: "error",
				rule: "consumption-by-operation",
				message: `"${consumer.name}" says its consumption of "${consumable.name}" is made by ${reactorLabel(caller).toLowerCase()} "${caller.name}"; a ${reactorLabel(caller).toLowerCase()} issues an operation of its own context and that operation makes the call, so name that operation here`,
				ref: consumption.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * A cross-context consumption of an operation says which of the consumer's own
 * operations makes the call, unless the consumer has only one and there is
 * nothing to choose between.
 *
 * `by` is the one causal link the model has across a boundary: the flow map and
 * `reaction-cycle` follow it from a local operation through the consumption to
 * the consumed operation and what that raises (decision 21's amendment). Left
 * off, the chain dead-ends at the boundary — a lifecycle that runs through
 * three contexts reads as three unrelated stubs — and the reader is told only
 * that some part of a service depends on a neighbour, which for a service with
 * six operations is barely more than the context map already said. A consumer
 * providing one operation is its own answer, so the model does not make it say
 * so twice; a consumer providing none, an external context's edge for instance,
 * has nothing to name and is left alone.
 *
 * A warning rather than an error: the exchange is real and drawn either way,
 * and an author part-way through an interview should not be blocked for not yet
 * knowing which operation calls out (decision 21, third amendment).
 */
const consumptionByRequired: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const consumption of consumptionsOf(workspace)) {
		const { consumer, consumable } = consumption;
		const upstream = consumable.provider.boundedcontext;
		if (consumable.type !== "operation") continue;
		if (upstream === consumer.boundedcontext) continue;
		if (consumption.by.length > 0) continue;
		const operations = [...consumer.consumables.values()].filter(
			(it) => it.type === "operation",
		);
		if (operations.length < 2) continue;
		diagnostics.push({
			severity: "warning",
			rule: "consumption-by-required",
			message: `"${consumer.name}" consumes "${consumable.name}" from "${upstream.name}" without saying which of its own operations makes the call; it provides ${operations.map((it) => `"${it.name}"`).join(", ")}`,
			ref: consumption.ref,
		});
	}
	return diagnostics;
};

/**
 * A policy or a process reacting to another context's event has a consumption
 * of that event in its own context.
 *
 * Decision 17 says a subscription is a consumption, and until now nothing made
 * it one: a reactor could name a neighbour's event with no consumption anywhere,
 * so neither the context map nor the consumable map drew the dependency and
 * `mud-needs-acl` never saw a context reacting to a big ball of mud. The
 * consumption is where the terms of the exchange are written — the downstream
 * role, the comments, the disposition — and a subscription has exactly those
 * terms to state.
 *
 * The consumption goes on the service or the aggregate that owns the reaction,
 * which is the node providing the operations the reactor issues, and its `by`
 * names the reactor: a policy is allowed in a `by` precisely because reacting
 * to a published fact is the commonest reason a consumption exists (decision
 * 21). Neither is enforced here — the rule asks for the consumption, not for a
 * particular place to hang it — but both are what the fix says to write.
 *
 * An error, because without it the model is silent about a dependency it has:
 * the reactor is written against the neighbour's event and no map says so.
 */
const subscriptionConsumed: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of modelledContexts(workspace)) {
		const taken = new Set<Consumable>();
		for (const member of [...bc.aggregates.values(), ...bc.services.values()])
			for (const consumption of member.consumptions)
				taken.add(consumption.consumable);
		for (const reactor of reactorsOf(bc)) {
			for (const event of subscribedEvents(reactor)) {
				const upstream = event.provider.boundedcontext;
				if (upstream === bc || taken.has(event)) continue;
				diagnostics.push({
					severity: "error",
					rule: "subscription-consumed",
					message: `${reactorLabel(reactor)} "${reactor.name}" reacts to "${event.name}" from "${upstream.name}", but nothing in "${bc.name}" consumes it; a context takes a foreign fact in at its own boundary, so the subscription is a consumption and reads as one on both maps`,
					ref: reactor.ref,
				});
			}
		}
	}
	return diagnostics;
};

/**
 * A consumed event has something under it: a policy or a process of the
 * consumer's context that reacts to it, or a `by` saying which of the
 * consumer's own parts the subscription is for.
 *
 * `subscription-consumed` asks the other half of the question — a reactor's
 * foreign event needs a consumption — and between them the two say that a
 * subscription and its reaction are one fact written from two sides. A
 * consumption with neither is a claim with nothing under it: the model says
 * this context takes that fact in, and nothing in it does anything when the
 * fact arrives. Usually the reaction was never written down; sometimes the
 * dependency is stale and the honest edit is to delete it. Either way the
 * consumable map draws an edge a reader cannot follow anywhere.
 *
 * A warning rather than an error, because the subscription may be real and the
 * reaction simply not modelled yet, and because `by` clears it: a consumer that
 * says which of its operations reads the feed has said what is under it, even
 * where no policy reacts (a projection updated by an operation, a report that
 * accumulates).
 */
const subscriptionBacked: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of modelledContexts(workspace)) {
		const reacted = new Set<ReactionTrigger>();
		for (const reactor of reactorsOf(bc))
			for (const trigger of subscribedTriggers(reactor)) reacted.add(trigger);
		for (const member of [...bc.aggregates.values(), ...bc.services.values()])
			for (const consumption of member.consumptions) {
				const { consumable } = consumption;
				if (consumable.type !== "event") continue;
				if (reacted.has(consumable) || consumption.by.length > 0) continue;
				diagnostics.push({
					severity: "warning",
					rule: "subscription-backed",
					message: `"${member.name}" consumes "${consumable.name}" from "${consumable.provider.boundedcontext.name}", but nothing in "${bc.name}" reacts to it and the consumption names no caller; a subscription nothing acts on is a dependency with nothing under it`,
					ref: consumption.ref,
				});
			}
	}
	return diagnostics;
};

/**
 * A policy names operations of its own context. Reacting to another context's
 * event is a consumption and crosses the boundary; acting inside another
 * context does not (decision 17).
 */
const policyInContext: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of modelledContexts(workspace)) {
		for (const policy of bc.policies.values()) {
			for (const command of policy.commands) {
				const owner = command.boundedcontext;
				if (owner === bc) continue;
				diagnostics.push({
					severity: "error",
					rule: "policy-in-context",
					message: `Policy "${policy.name}" in "${bc.name}" issues "${command.name}", which belongs to "${owner.name}"`,
					ref: policy.ref,
				});
			}
		}
	}
	return diagnostics;
};

/**
 * A process names operations of its own context, for the same reason a policy
 * does. What starts it, what it waits for and what ends it may be another
 * context's events — subscribing to a published fact is how contexts
 * integrate — but acting inside a neighbour is that neighbour's own to do
 * (decisions 17 and 23).
 */
const processInContext: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const process of processesOf(workspace)) {
		for (const command of process.commands) {
			const owner = command.boundedcontext;
			if (owner === process.boundedcontext) continue;
			diagnostics.push({
				severity: "error",
				rule: "process-in-context",
				message: `Process "${process.name}" in "${process.boundedcontext.name}" issues "${command.name}", which belongs to "${owner.name}"`,
				ref: process.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * A process says how an instance finishes.
 *
 * A process exists because something has to be remembered between events, and
 * what is remembered has to be forgotten: the instance ends, or it is state
 * that accumulates forever. A process with no `ends` is either a policy
 * wearing a longer name — stateless, one reaction, no waiting — or a real
 * process whose author has not said how it finishes, and a reader cannot tell
 * which from the model (decision 23).
 */
const processHasEnds: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const process of processesOf(workspace)) {
		if (process.endEvents.length > 0) continue;
		diagnostics.push({
			severity: "warning",
			rule: "process-has-ends",
			message: `Process "${process.name}" names no event that completes an instance, so the model never says how it finishes`,
			ref: process.ref,
		});
	}
	return diagnostics;
};

/** A process says what begins an instance. */
const processStarts: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const process of processesOf(workspace)) {
		if (process.startEvents.length > 0) continue;
		diagnostics.push({
			severity: "error",
			rule: "process-starts",
			message: `Process "${process.name}" names no event that begins an instance, so nothing in the model says when one exists`,
			ref: process.ref,
		});
	}
	return diagnostics;
};

/**
 * What a context offers outward is provided by an application service, so the
 * operations of an aggregate or a domain service carry no upstream role and
 * are consumed only from inside their own context (decision 17). Events are
 * untouched: an aggregate still publishes the facts its context is known by.
 */
function operationsStayInside(
	rule: string,
	label: string,
	provider: Aggregate | Service,
): Diagnostic[] {
	const bc = provider.boundedcontext;
	const diagnostics: Diagnostic[] = [];
	for (const operation of provider.consumables.values()) {
		if (operation.type !== "operation") continue;
		if (operation.pattern) {
			diagnostics.push({
				severity: "error",
				rule,
				message: `${label} "${provider.name}" offers "${operation.name}" as ${operation.pattern}, but what "${bc.name}" offers outward is provided by an application service`,
				ref: operation.ref,
			});
		}
		for (const { consumer } of operation.consumptions) {
			if (consumer.boundedcontext === bc) continue;
			diagnostics.push({
				severity: "error",
				rule,
				message: `"${consumer.name}" in "${consumer.boundedcontext.name}" consumes "${operation.name}", an operation of ${label.toLowerCase()} "${provider.name}" internal to "${bc.name}"`,
				ref: consumer.ref,
			});
		}
	}
	return diagnostics;
}

/** An aggregate's operations are its context's own, not its public boundary. */
const aggregateNotPublic: Rule = (workspace) =>
	Array.from(modelledContexts(workspace)).flatMap((bc) =>
		Array.from(bc.aggregates.values()).flatMap((aggregate) =>
			operationsStayInside("aggregate-not-public", "Aggregate", aggregate),
		),
	);

/**
 * An aggregate consumes only its own context's consumables. An aggregate is a
 * consistency boundary, not a client: reaching across a boundary means
 * translation, failure and waiting on someone else's availability, none of
 * which belong inside the transaction that keeps an invariant true. The
 * context's application service makes the foreign call and hands the aggregate
 * what it needs, or a policy reacts to the foreign event and issues an
 * operation of this context (decision 17, amended 2026-09-07).
 */
const aggregateConsumesInside: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of modelledContexts(workspace)) {
		for (const aggregate of bc.aggregates.values()) {
			for (const { consumable } of aggregate.consumptions) {
				const owner = consumable.provider.boundedcontext;
				if (owner === bc) continue;
				const instead =
					consumable.type === "event"
						? `let a policy of "${bc.name}" react to it and issue an operation of "${bc.name}"`
						: `let an application service of "${bc.name}" make the call`;
				diagnostics.push({
					severity: "error",
					rule: "aggregate-consumes-inside",
					message: `Aggregate "${aggregate.name}" consumes "${consumable.name}" from "${owner.name}"; an aggregate is a consistency boundary, not a client, so ${instead} and hand "${aggregate.name}" what it needs`,
					ref: aggregate.ref,
				});
			}
		}
	}
	return diagnostics;
};

/**
 * A domain service consumes only its own context's consumables, for the same
 * reason an aggregate does.
 *
 * A domain service is the inside of the model: it holds domain logic that
 * belongs to no single aggregate, and decision 17 keeps it internal in the
 * other direction already — its operations carry no upstream role and nobody
 * outside may call them. The outbound half is the same principle. Reaching
 * across a boundary is translation, failure and waiting on somebody else's
 * availability, and a rule that has to do that is not the bank's own logic
 * about its own model; the application service makes the call and hands the
 * domain service what it needs, or a policy reacts to the foreign fact and
 * issues an operation of this context (decision 17's second amendment).
 */
const domainServiceConsumesInside: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of modelledContexts(workspace)) {
		for (const service of bc.services.values()) {
			if (service.type !== "domain") continue;
			for (const { consumable } of service.consumptions) {
				const owner = consumable.provider.boundedcontext;
				if (owner === bc) continue;
				const instead =
					consumable.type === "event"
						? `let an application service of "${bc.name}" take it in, with the policy or process that reacts to it named in \`by\``
						: `let an application service of "${bc.name}" make the call`;
				diagnostics.push({
					severity: "error",
					rule: "domain-service-consumes-inside",
					message: `Domain service "${service.name}" consumes "${consumable.name}" from "${owner.name}"; a domain service is the inside of the model, not a client, so ${instead} and hand "${service.name}" what it needs`,
					ref: service.ref,
				});
			}
		}
	}
	return diagnostics;
};

/** A domain service is internal logic, so its operations stay inside too. */
const domainServiceInternal: Rule = (workspace) =>
	Array.from(workspace.boundedcontexts.values()).flatMap((bc) =>
		Array.from(bc.services.values())
			.filter((service) => service.type === "domain")
			.flatMap((service) =>
				operationsStayInside(
					"domain-service-internal",
					"Domain service",
					service,
				),
			),
	);

/**
 * A value object is its own context's, and an attribute types itself by
 * another context's value only where the model has said the two share it.
 *
 * This is the boundary decision 16 is about: a value object is part of a
 * bounded context's ubiquitous language, so an insurer's Claims typing a
 * reserve by Policy Admin's `Money` has written its own model in a word
 * somebody else owns and may redefine. The two exceptions are the two
 * `schema-context` makes, read with the same predicate: a shared kernel, where
 * both contexts keep part of one model between them, and a conformist
 * downstream, which takes the upstream's model as it stands (decisions 16 and
 * 03). The record claimed the boundary was sealed for five days while nothing
 * read `attribute.valueobject` at all; Prowl's third review found it.
 */
const valueObjectContext: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const { attribute, valueobject, from } of valueObjectBorrowings(
		workspace,
	)) {
		const owner = valueobject.boundedcontext;
		if (mayBorrowFrom(workspace, from, owner)) continue;
		diagnostics.push({
			severity: "error",
			rule: "valueobject-context",
			message: `"${attribute.owner.name}" in "${from.name}" types attribute "${attribute.name}" by value object "${valueobject.name}" from "${owner.name}"; a value object is part of one context's language, so borrowing it wants a shared kernel with "${owner.name}" or a conformist relationship toward it`,
			ref: attribute.ref,
		});
	}
	return diagnostics;
};

/**
 * A payload shape is its own context's, wherever it is named: on a consumable
 * that sends, answers or refuses with it, and on an attribute that nests it
 * (decision 18). There are two exceptions, and both are declarations the model
 * already carries. One is a context this one shares a kernel with: that
 * relationship says the two keep part of one model between them (decision 16).
 * The other is an upstream this context has declared itself a conformist of:
 * a conformist adopts the upstream's model as it stands, which is precisely
 * what carrying its shapes is, and it is how a regulator's message formats or
 * a scheme's record layouts enter a model without anybody pretending they are
 * ours (decisions 03 and 28). The borrowing runs downstream only.
 */
const schemaContext: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	/** Whether the schema is another context's and nothing lets this one borrow it. */
	const borrowedBy = (schema: DataSchema, bc: BoundedContext) =>
		schema.boundedcontext !== bc &&
		!mayBorrowFrom(workspace, bc, schema.boundedcontext);
	for (const { owner, context } of attributeOwnersOf(workspace)) {
		for (const attribute of owner.attributes.values()) {
			if (!attribute.schema || !borrowedBy(attribute.schema, context)) continue;
			diagnostics.push({
				severity: "error",
				rule: "schema-context",
				message: `"${owner.name}" types attribute "${attribute.name}" by schema "${attribute.schema.name}" from "${attribute.schema.boundedcontext.name}"; a payload belongs to the context that publishes it`,
				ref: attribute.ref,
			});
		}
	}
	for (const bc of workspace.boundedcontexts.values()) {
		const borrowed = (schema: DataSchema) => borrowedBy(schema, bc);
		for (const p of [...bc.aggregates.values(), ...bc.services.values()]) {
			for (const c of p.consumables.values()) {
				if (c.schema && borrowed(c.schema)) {
					diagnostics.push({
						severity: "error",
						rule: "schema-context",
						message: `"${c.name}" carries schema "${c.schema.name}" from "${c.schema.boundedcontext.name}"; a payload belongs to the context that publishes it`,
						ref: c.ref,
					});
				}
				if (c.returns && borrowed(c.returns)) {
					diagnostics.push({
						severity: "error",
						rule: "schema-context",
						message: `"${c.name}" returns schema "${c.returns.name}" from "${c.returns.boundedcontext.name}"; a payload belongs to the context that publishes it`,
						ref: c.ref,
					});
				}
				for (const rejection of c.rejects) {
					if (!borrowed(rejection)) continue;
					diagnostics.push({
						severity: "error",
						rule: "schema-context",
						message: `"${c.name}" rejects with schema "${rejection.name}" from "${rejection.boundedcontext.name}"; a payload belongs to the context that publishes it`,
						ref: c.ref,
					});
				}
				if (c.internal && c.pattern) {
					diagnostics.push({
						severity: "warning",
						rule: "internal-consumable",
						message: `"${c.name}" is internal but declares the upstream role "${c.pattern}", which only matters to other contexts`,
						ref: c.ref,
					});
				}
			}
		}
	}
	return diagnostics;
};

/** Only an operation answers its caller, so only an operation declares returns. */
const returnsOnOperation: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		for (const p of [...bc.aggregates.values(), ...bc.services.values()]) {
			for (const c of p.consumables.values()) {
				if (c.type === "event" && c.returns) {
					diagnostics.push({
						severity: "error",
						rule: "returns-on-operation",
						message: `"${c.name}" is an event but declares returns "${c.returns.name}"; an event is a fact nobody answers`,
						ref: c.ref,
					});
				}
			}
		}
	}
	return diagnostics;
};

/** Only an operation is refused, so only an operation declares rejections. */
const rejectsOnOperation: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		for (const p of [...bc.aggregates.values(), ...bc.services.values()]) {
			for (const c of p.consumables.values()) {
				if (c.type !== "event" || !c.rejects.length) continue;
				diagnostics.push({
					severity: "error",
					rule: "rejects-on-operation",
					message: `"${c.name}" is an event but rejects with ${c.rejects.map((it) => `"${it.name}"`).join(", ")}; an event is a fact that already happened, so there is nothing left to refuse`,
					ref: c.ref,
				});
			}
		}
	}
	return diagnostics;
};

/**
 * Policies and processes react to events, and to the answers the operations
 * their context calls come back with; they issue operations, and operations
 * raise events.
 *
 * An answer is a schema an operation returns or rejects with, and the schema
 * has to be one of those: waiting on a payload nobody answers with is waiting
 * for something that never arrives. The operation also has to be one the
 * reactor's own context consumes, because a context hears an answer by having
 * made the call (see {@link answersAwaitedIn}). What the model does not check
 * is which branch the reactor takes on it; that is the code's, as every other
 * condition in a process is (decisions 15 and 23).
 */
const consumableKinds: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		// An external context's policies and processes are refused outright by
		// external-is-boundary; there is nothing here to say about them.
		const reactors = bc.external ? [] : reactorsOf(bc);
		const answers: Set<DataSchema> = reactors.length
			? answersAwaitedIn(bc)
			: new Set();
		for (const reactor of reactors) {
			for (const trigger of subscribedTriggers(reactor)) {
				if (!(trigger instanceof DataSchema) || answers.has(trigger)) continue;
				diagnostics.push({
					severity: "error",
					rule: "consumable-kind",
					message: `${reactorLabel(reactor)} "${reactor.name}" waits for "${trigger.name}", which no operation "${bc.name}" consumes answers with; name the operation that returns or rejects with "${trigger.name}", and consume it, or react to an event instead`,
					ref: reactor.ref,
				});
			}
			for (const c of subscribedEvents(reactor).filter(
				(c) => c.type !== "event",
			)) {
				diagnostics.push({
					severity: "error",
					rule: "consumable-kind",
					message: `${reactorLabel(reactor)} "${reactor.name}" reacts to "${c.name}", which is an operation, not an event`,
					ref: reactor.ref,
				});
			}
			for (const c of reactor.commands.filter((c) => c.type !== "operation")) {
				diagnostics.push({
					severity: "error",
					rule: "consumable-kind",
					message: `${reactorLabel(reactor)} "${reactor.name}" issues "${c.name}", which is an event, not an operation`,
					ref: reactor.ref,
				});
			}
		}
		for (const p of [...bc.aggregates.values(), ...bc.services.values()]) {
			for (const c of p.consumables.values()) {
				if (c.type === "event" && c.raisedEvents.length) {
					diagnostics.push({
						severity: "error",
						rule: "consumable-kind",
						message: `"${c.name}" is an event but declares raises; only operations raise events`,
						ref: c.ref,
					});
				}
				for (const e of c.raisedEvents.filter((e) => e.type !== "event")) {
					diagnostics.push({
						severity: "error",
						rule: "consumable-kind",
						message: `"${c.name}" raises "${e.name}", which is an operation, not an event`,
						ref: c.ref,
					});
				}
			}
		}
	}
	return diagnostics;
};

/**
 * An operation raises events of its own context.
 *
 * A context publishes its own facts and nobody else's: an event is something
 * that happened inside a boundary, named in that boundary's language, and the
 * context it happened in is the only one that can say so. Claiming to raise
 * the context next door's event says two things that are both false — that
 * this operation can make a fact true over there, and that the other context's
 * published event means whatever this one needs it to mean.
 *
 * It matters more since the flow map and `reaction-cycle` read `by` as the one
 * causal link across a boundary: without this rule an author could write a
 * foreign event under `raises` and fake that link, and the chain would read as
 * though a context had reached through the wall. Acting on another context is
 * a consumption, and what comes back is that context's own event.
 */
const raisesInContext: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		for (const p of [...bc.aggregates.values(), ...bc.services.values()]) {
			for (const c of p.consumables.values()) {
				for (const event of c.raisedEvents) {
					const owner = event.provider.boundedcontext;
					if (owner === bc) continue;
					diagnostics.push({
						severity: "error",
						rule: "raises-in-context",
						message: `"${c.name}" raises "${event.name}", which belongs to "${owner.name}"; a context publishes its own facts, so "${bc.name}" cannot raise another context's event`,
						ref: c.ref,
					});
				}
			}
		}
	}
	return diagnostics;
};

/**
 * A front does not restate what it calls raises.
 *
 * An open-host operation that runs an aggregate's transition, and names it in
 * the consumption's `by`, already reaches that transition's events: `by` is
 * the causal link the flow map draws and `reaction-cycle` walks (decision 21's
 * amendment), so the chain carries the fact from where it happens. Repeating
 * the event under the front's own `raises` says instead that both raise it,
 * and the copy is free to drift from what the aggregate actually raises. An
 * event is raised where it happens, once.
 *
 * Only what the front reaches is reported: an event a front raises itself and
 * nothing it calls raises is its own fact and is left alone.
 */
const raisesRestated: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of modelledContexts(workspace)) {
		for (const provider of [...bc.aggregates.values(), ...bc.services.values()])
			for (const operation of provider.consumables.values()) {
				if (operation.type !== "operation") continue;
				const reached = reachedEvents(operation);
				for (const event of operation.raisedEvents) {
					if (!reached.includes(event)) continue;
					diagnostics.push({
						severity: "warning",
						rule: "raises-restated",
						message: `"${operation.name}" raises "${event.name}", which "${raisersAmong(operation, event).join('", "')}" already raises through the consumption it makes; drop it, the chain carries it`,
						ref: operation.ref,
					});
				}
			}
	}
	return diagnostics;
};

/**
 * The operations `operation` calls that reach `event`, named so the warning
 * says where the fact really happens rather than only that it is a copy.
 */
const raisersAmong = (operation: Consumable, event: Consumable): string[] =>
	operation.provider.consumptions
		.filter(
			(c) => c.consumable.type === "operation" && c.by.includes(operation),
		)
		.map((c) => c.consumable)
		.filter(
			(called) =>
				called.raisedEvents.includes(event) ||
				reachedEvents(called).includes(event),
		)
		.map((called) => called.name);

/**
 * Something in a context raises each of its events.
 *
 * An event is a fact that happened inside a boundary, and the model says what
 * made it happen by naming the operation that raises it. An event no
 * operation raises reads as dead model to everyone downstream: nobody can
 * follow the chain back, and a policy hanging off it looks like it will never
 * fire. Usually the answer is that an operation was never linked; sometimes
 * the honest answer is that the fact comes from outside -- a card scheme's
 * settlement file, a clock's day ending -- and then the thing that emits it
 * is an external context, which is a different statement and the model has a
 * word for it (decision 28).
 *
 * A big ball of mud is exempt. It is the enterprise's own system, so it is not
 * external, but nobody can say which of its programs raises a fact: asked for a
 * raiser, three reference models invented a nightly batch service that exists
 * in no interview note. A mud context may say what it emits without saying how
 * (see {@link knowableContexts}).
 */
const eventUnraised: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of knowableContexts(workspace)) {
		const providers = [...bc.aggregates.values(), ...bc.services.values()];
		const raised = new Set<Consumable>();
		for (const provider of providers)
			for (const consumable of provider.consumables.values())
				for (const event of consumable.raisedEvents) raised.add(event);
		for (const provider of providers)
			for (const consumable of provider.consumables.values()) {
				if (consumable.type !== "event" || raised.has(consumable)) continue;
				diagnostics.push({
					severity: "warning",
					rule: "event-unraised",
					message: `No operation of "${bc.name}" raises "${consumable.name}", so the model never says what makes it happen`,
					ref: consumable.ref,
				});
			}
	}
	return diagnostics;
};

/** A policy reacts to something and does something. */
const policyComplete: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	const policies: Policy[] = Array.from(modelledContexts(workspace)).flatMap(
		(bc) => Array.from(bc.policies.values()),
	);
	for (const policy of policies) {
		if (policy.events.length === 0 || policy.commands.length === 0) {
			diagnostics.push({
				severity: "warning",
				rule: "policy-complete",
				message: `Policy "${policy.name}" ${policy.events.length === 0 ? "reacts to no event" : "issues no command"}`,
				ref: policy.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * Whether a ring is one process's own lifecycle rather than a cycle.
 *
 * A process issues an operation, the operation raises the event the process
 * waits for next, and so on to the end: that is the ordinary multi-step
 * process, and the chain walks it as a ring back into the same process. It is
 * not one. The process holds state — it remembers which of its events have
 * arrived — so the second pass round is a different instance's, or a later
 * step of the same one, and what ends it is the `ends` the process declares
 * (decision 23). What makes it safe to say is that the walk came back to the
 * process itself and to no other reactor: a ring through two processes, or
 * through a process and a policy, is a genuine loop nobody on it can see the
 * whole of, and is reported.
 */
function isProcessLifecycle(cycle: Reactor[]): boolean {
	const reactors = cycle.filter(
		(node): node is Policy | Process =>
			node instanceof Process || node instanceof Policy,
	);
	return reactors.length === 1 && reactors[0] instanceof Process;
}

/**
 * The reactions form no cycle: no operation raises an event whose policy or
 * process issues an operation that leads, however far around, back to the
 * first.
 *
 * A ring like that runs forever unless something outside the model stops it,
 * and nothing in the model says what — so it is the modeller who has to look
 * and either break the ring or write down the condition that ends it. The
 * chain is `ReactionChain`'s, the one the flow map draws, so it follows a
 * consumption's `by` out of a context and the ring may run through several
 * of them; when it does, the message names every context on it, because a
 * loop nobody owns end to end is the one worth spelling out.
 *
 * One shape is exempt: a process fed by its own steps, which is a lifecycle
 * and not a ring (see {@link isProcessLifecycle}).
 */
const reactionCycle: Rule = (workspace) => {
	const chain = new ReactionChain(workspace.boundedcontexts.values());
	return cyclesOf(
		chain.steps,
		(node) => chain.after(node),
		(node) => node.ref,
	)
		.filter((cycle) => !isProcessLifecycle(cycle))
		.map((cycle) => {
			const contexts = [...new Set(cycle.map((n) => n.boundedcontext))];
			const across =
				contexts.length > 1
					? `; it runs through ${contexts.map((c) => `"${c.name}"`).join(" and ")}, so no one context can see the whole ring`
					: "";
			return {
				severity: "warning" as const,
				rule: "reaction-cycle",
				message: `Reactions run in a cycle: ${[...cycle, cycle[0]]
					.map((n) => `"${n.name}"`)
					.join(
						" -> ",
					)}; the chain triggers itself and nothing in the model says what ends it${across}`,
				ref: cycle[0].ref,
			};
		});
};

/**
 * Every context serves at least one subdomain. An external context does not:
 * a card scheme or a licensor is not part of anybody's problem space here, so
 * it is not missing from the problem-space view -- it was never in it
 * (decision 28).
 */
const contextServesSubdomain: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of modelledContexts(workspace)) {
		if (bc.subdomains.size === 0) {
			diagnostics.push({
				severity: "warning",
				rule: "context-serves-subdomain",
				message: `Bounded context "${bc.name}" serves no subdomain, so it is missing from the problem-space view`,
				ref: bc.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * An external context is a boundary and nothing more.
 *
 * A card scheme, a payment provider, a licensor or a clock is a system the
 * enterprise integrates with and does not model inside. What it offers and
 * what it takes are ours to write down, because we depend on them; its
 * aggregates, its policies, its processes and the rules it keeps are not,
 * because we cannot know them and the model would be inventing. That last one
 * covers a rule on a value object as much as one across instances: an external
 * context states no rules of its own, and its value objects are vocabulary we
 * name so that our own model can carry its shapes (decision 28, second
 * amendment). Marking the context external is the author saying "this is
 * somebody else's machine", and this rule holds them to it.
 */
const externalIsBoundary: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		if (!bc.external) continue;
		const refuse = (what: string, ref: string) =>
			diagnostics.push({
				severity: "error",
				rule: "external-is-boundary",
				message: `External context "${bc.name}" declares ${what}; what happens inside a system we do not own is not ours to state, only what it provides and what it consumes`,
				ref,
			});
		for (const aggregate of bc.aggregates.values())
			refuse(`aggregate "${aggregate.name}"`, aggregate.ref);
		for (const policy of bc.policies.values())
			refuse(`policy "${policy.name}"`, policy.ref);
		for (const process of bc.processes.values())
			refuse(`process "${process.name}"`, process.ref);
		for (const invariant of bc.invariants.values())
			refuse(`invariant "${invariant.name}"`, invariant.ref);
		// A value object of an external context is its published vocabulary, and
		// the rules on it — an IBAN's mod-97 checksum, an ISO 20022 field rule, a
		// scheme's record layout — are that standard's published contract, known
		// and citable rather than invented. They stay, and
		// `invariant-in-value-object` checks them like any other (decision 28,
		// third amendment).
	}
	return diagnostics;
};

/**
 * Every context relationship carries at least one comment. Opt-in: a workspace
 * asks for it with `options.rules.commentsRequired`, because a model that has
 * not started on its evidence layer yet should not be buried in warnings.
 */
const commentsRequired: Rule = (workspace) => {
	if (!workspace.options?.rules?.commentsRequired) return [];
	return relationshipsWithoutComments(workspace).map((r) => ({
		severity: "warning" as const,
		rule: "comments-required",
		message: `"${r.source.name}" and "${r.target.name}" are related as ${r.type}, but nothing is written down about the real system behind it`,
		ref: r.ref,
	}));
};

/** Names a strategic intent the way a Problems row has to read on its own. */
function intentLabel(intent: StrategicIntent): string {
	if (intent instanceof ContextRelationship)
		return `The ${intent.type} between "${intent.source.name}" and "${intent.target.name}"`;
	if (intent instanceof Consumption)
		return `"${intent.consumer.name}"'s consumption of "${intent.consumable.name}"`;
	if (intent instanceof Process)
		return `The process "${intent.name}" in "${intent.boundedcontext.name}"`;
	return `"${intent.name}", provided by "${intent.provider.name}"`;
}

/**
 * A disposition other than `by-design` is a claim that something is wrong: the
 * intent is `tolerated` for now, or wants a `refactor`. Either way the next
 * reader needs to know what makes it so and what it would take to clear it,
 * and only a comment carries that. `by-design` says nothing is owed.
 *
 * "Intent" here is {@link intentsWithoutComments}'s reading, so internal
 * consumables are out: they never cross a boundary and so are not strategic.
 */
const dispositionNeedsComment: Rule = (workspace) =>
	intentsWithoutComments(workspace)
		.filter((intent) => dispositionOf(intent) !== "by-design")
		.map((intent) => ({
			severity: "warning" as const,
			rule: "disposition-needs-comment",
			message: `${intentLabel(intent)} is marked ${dispositionOf(intent)}, but carries no comment saying what makes it so or what would clear it`,
			ref: intent.ref,
		}));

/** What a validation rule checks, in words a reader new to DDD can follow. */
export type RuleDescription = {
	/** The stable id carried by every diagnostic the rule emits. */
	rule: string;
	/** The severities the rule can emit. */
	severities: DiagnosticSeverity[];
	/** One sentence saying what the rule requires. */
	summary: string;
	/** Why the model is better for it, in plain language. */
	why: string;
	/** The edit that usually resolves the diagnostic. */
	fix: string;
};

type CataloguedRule = RuleDescription & { check: Rule };

const RULES: CataloguedRule[] = [
	{
		rule: "aggregate-root",
		severities: ["warning", "error"],
		summary:
			"Every aggregate of a context whose insides are knowable has exactly one root entity.",
		why: "The root is the one thing you name the cluster after and reach it through; without it nobody knows where the rules are enforced, and with two the boundary is really two aggregates. A big ball of mud is exempt: it is the enterprise's own system, so it is not external, but nobody can read it well enough to say what leads its clusters, and demanding a root there only invites an invented one (decision 28).",
		fix: "Mark the entity the aggregate is named after with root: true, or split the aggregate if two entities genuinely lead their own clusters. If the truth is that nobody knows, and the context really is one nobody can read, say so with bigBallOfMud: true rather than guessing.",
		check: aggregateRoot,
	},
	{
		rule: "cross-aggregate-reference",
		severities: ["error"],
		summary:
			"A relation into another aggregate uses references and targets that aggregate's root, or a kind of that root; a relation to a value object crosses nothing.",
		why: "Aggregates are consistency boundaries; reaching inside another one couples the two so they can no longer change or be stored independently. A value object belongs to the whole context rather than to one aggregate, so using one is not reaching into anybody. A kind of the root is the root said more precisely — an instance of it is an instance of the root, carrying the same identity — so naming the kind the business names reaches no further inside than naming the root would.",
		fix: "Change the relation to \"references\" and point it at the other aggregate's root entity, or at a kind of that root, holding only its identity. When the thing you mean is a child of that aggregate, hold its id as an attribute beside the root's: the pair says which child without reaching past the root that owns it.",
		check: crossAggregateReference,
	},
	{
		rule: "cross-context-relation",
		severities: ["error"],
		summary:
			"A relation never crosses a bounded context; only an identity does.",
		why: "Each context is its own model with its own language and lifecycle (decision 03), so a relation across the boundary makes one context's entity part of the other's object graph and the two can no longer be loaded, changed or stored apart. Decision 08's crossing table already says an entity relation's target may not cross a file, and splitting the contexts into their own files is exactly what turns this relation into a load error.",
		fix: "Delete the relation and give the source an attribute holding the other entity's identity — an Order in Sales carries petId rather than a relation to Catalog's Pet. That identity may name a child of the other model as readily as its root, since the child is reached through that root. The dependency between the two contexts then reads where it belongs, on the consumable map: the consumable the source consumes and the context relationship between the two.",
		check: crossContextRelation,
	},
	{
		rule: "identifies-entity",
		severities: ["error"],
		summary:
			"An attribute's identifies names an entity of this workspace, root or child, in any aggregate of any context, or a bounded context marked external.",
		why: "An identity attribute is how one part of the model depends on another without holding it: it says which thing out there this one is about, and it is the one dependency allowed to cross a bounded context (decision 14). That thing may be a child, because systems point at child identities constantly — a playback session names a profile inside a household, a claim a coverage inside a policy, a shipment an order's line — and the child stays inside its aggregate exactly because its parent's invariants need it there; you hold the child's id, with its root's id beside it, and reach it through that root, so the dependency is really on the aggregate the root leads. Holding the id is not reaching inside: what reaches inside is a relation into another aggregate's members, and cross-aggregate-reference refuses that and recommends this id in its place. It may also be an external context: a card scheme's authorisation id or a payment provider's customer id belongs to a system whose entities are not ours to state (decision 28), so the attribute names the system and the maps still draw the dependency. A context that is not external is refused, because there the entity exists and naming the whole context would say less. What the id may never name is something this workspace does not have, since then it reaches nothing.",
		fix: "Point identifies at an entity of this workspace — the root when you deal with the whole, the child when the business really names the child, with the root's id beside it — or, for an id that belongs to a system you do not model inside, at that system's bounded context, marked external: true. Check the target has not been renamed or moved out from under the attribute.",
		check: identifiesEntity,
	},
	{
		rule: "root-identity",
		severities: ["error"],
		summary:
			"The root entity of an aggregate in a context whose insides are knowable declares at least one identity attribute.",
		why: "An entity is the thing that stays itself while its values change, and the root is what the rest of the model reaches the aggregate by. With no identity on it, nothing can say which one of them a reference, an event payload or a stored row is about. A big ball of mud is exempt for the same reason it is exempt from aggregate-root: nobody can read its keys either (decision 28).",
		fix: "Mark the attribute the business uses to tell one apart — the order number, the customer id — with identity: true, or make the element a value object if there really is nothing to identify.",
		check: rootIdentity,
	},
	{
		rule: "entity-identity",
		severities: ["warning"],
		summary:
			"Every non-root entity of a context whose insides are knowable declares at least one identity attribute.",
		why: "An entity is precisely the thing you can still tell apart from another one holding exactly the same values. Without an identity attribute nothing does the telling apart, so the element is a value object that has been filed under the wrong heading, and readers will expect a lifecycle and a history it does not have. A kind counts as identified by what it is a kind of, since it has that entity's attributes as its own. A big ball of mud is exempt, as it is from aggregate-root and root-identity: nobody can read a legacy system well enough to say which of its columns tells one row from another, and asking only invites an invented key (decision 28).",
		fix: "Give the entity the attribute the business identifies it by — the line number, the reference — with identity: true, or make it a value object, which is usually what an entity with nothing to identify really was. If the truth is that nobody knows, and the context really is one nobody can read, say so with bigBallOfMud: true rather than guessing.",
		check: entityIdentity,
	},
	{
		rule: "value-object-shape",
		severities: ["error"],
		summary:
			"A value object declares no identity attribute, and its relations use other value objects: it includes nothing, references nothing and reaches no entity.",
		why: "Two value objects with the same values are the same value: that is what makes them safe to copy, compare and replace. An identity attribute contradicts that; includes claims a lifecycle a value object does not own; and a reference holds another aggregate's identity, which a value has none of. Reaching an entity is the one cross-aggregate-reference cannot see — that rule reads the aggregate at each end and a value object sits in none, since it belongs to the whole context — so a value pointing into another aggregate's insides went unreported while the same relation from an entity was refused. The reason here is the value's own: a value is a value of something, and nothing is reached through it.",
		fix: "Drop identity: true from the attribute, or promote the element to an entity if it really has a life of its own; change an includes or a references on a value object to uses; and where the target is an entity, hold its id as an attribute with identifies instead of relating to it.",
		check: valueObjectShape,
	},
	{
		rule: "identity-not-optional",
		severities: ["error"],
		summary: "An identity attribute is not marked optional.",
		why: "An identity is the one thing that tells an instance apart from another holding exactly the same values, and it is what a reference, an event payload or a stored row names that instance by. An identity that is sometimes absent cannot do either job: the instances without it are indistinguishable and unreachable, so what the element really has is no identity at all.",
		fix: "Drop optional: true from the identity attribute. If the value genuinely is sometimes missing, it is not the identity — mark the attribute the business always has as the identity instead, or make the element a value object if there is nothing it is always identified by.",
		check: identityNotOptional,
	},
	{
		rule: "specialisation-in-boundary",
		severities: ["error"],
		summary:
			"An entity is a kind of an entity of its own aggregate; a value object is a kind of one its own context declares, or one it borrows through a shared kernel or as a conformist of the context that owns it.",
		why: "A kind is the same thing said more precisely, so it lives where the thing lives. An entity and the entity it is a kind of are loaded, saved and kept consistent through one root, and a parent in another aggregate would make one boundary's rules depend on another's. A value object is part of a context's ubiquitous language, and that language is legitimately shared in two places: a shared kernel, the declaration that two contexts keep part of one model between them, and a conformist's relationship with its upstream, where the downstream has said it takes that model as it stands.",
		fix: "Move the parent into the same aggregate as the kind, or the kind into the parent's; for a value object, declare the parent in this context, declare the shared kernel with the context that owns it if the two really do keep it in step, or declare this context a conformist of that one if it takes that model as it stands.",
		check: specialisationInBoundary,
	},
	{
		rule: "specialisation-cycle",
		severities: ["error"],
		summary: 'No chain of "is a kind of" returns to where it started.',
		why: "A kind adds to what it is a kind of, so the chain has to end somewhere at the thing all of them are. A ring has no such end: no reader and no tool can list what any element on it holds, because every answer needs the next one first, and whatever concept the chain was refining has been lost.",
		fix: "Point one of the links at the thing both of them really are, or drop it: two elements that are each a kind of the other are one element, or they are two kinds of a third that has not been named yet.",
		check: specialisationCycle,
	},
	{
		rule: "specialisation-not-root",
		severities: ["error"],
		summary: "An entity that is a kind of another is not itself marked root.",
		why: "An aggregate has exactly one root, and it is what everything else reaches the aggregate by. A kind of the root is reached through the root — an instance of the kind is an instance of it — so marking the kind root as well leaves a reference with two entities to land on and no way to say which the aggregate is saved through.",
		fix: "Drop root: true from the kind and leave it on the entity it is a kind of. If the kind really does lead a cluster of its own, it is another aggregate rather than a kind.",
		check: specialisationNotRoot,
	},
	{
		rule: "specialisation-redeclares",
		severities: ["error"],
		summary:
			"A kind does not declare an attribute it already has from what it is a kind of.",
		why: "The kind already has every attribute of its parent; declaring one of them again gives the same name two types, two descriptions and two places to change, and a reader has no way to tell which of them applies. It is also the usual sign of a hierarchy drawn after the fact over two elements that were written separately.",
		fix: "Delete the attribute from the kind and leave the parent's. If the kind genuinely holds something different under that name, the two are not the same attribute: give the kind's its own name, or the parent's attribute belongs on its other kinds rather than on the parent.",
		check: specialisationRedeclares,
	},
	{
		rule: "aggregate-tree",
		severities: ["error", "warning"],
		summary:
			"Inside an aggregate, includes points at entities and uses at value objects, and every entity is reachable from the root.",
		why: "The aggregate is loaded and saved as one thing through its root, so the parts of one instance hang off it as a tree. That is a claim about instances, and the model declares types, so no ring in the type graph is reported at all: a questionnaire whose groups hold questions that hold groups is a finite tree in every instance, and so is a category of categories. Keeping the instance tree a tree is the code's job. What the type graph can say is checked: an includes onto a value object or a uses onto an entity says the opposite of what the author means, and an entity nothing reaches is either dead or a missing relation. A kind is reached wherever the entity it is a kind of is reached, since an instance of it is one of those; specialisation is not containment and never joins the tree itself.",
		fix: "Point includes at entities and uses at value objects, and give an unreachable entity the relation that reaches it — or move it to its own aggregate.",
		check: aggregateTree,
	},
	{
		rule: "attribute-relation-coherence",
		severities: ["warning"],
		summary:
			"An attribute typed by a value object has a matching uses relation, matched by the relation's for where one value object is used twice, and the two agree about how many there are.",
		why: "The attribute list and the relation map are two views of the same statement. When one has what the other lacks, a reader gets a different model depending on which page they opened; and when they disagree about number the model says two things at once. Presence is not size: optional says whether the attribute is there and the cardinality says how many the value holds, so a required list may still hold none — Swagger's photoUrls is required with no minimum — and only three pairings are coherent. One value object may be used twice, a current address beside an address history, so with several relations to it each says with for which attribute it draws; the label stays the phrase the map reads. What a kind inherits counts as its own on both sides, so the pair may be completed by whatever it is a kind of.",
		fix: 'Add the missing uses relation or the missing attribute, and give the relation the cardinality the attribute already implies: * or 1..* for a list whether or not it is optional, 1 for a required attribute that is not a list, 0..1 for an optional one that is not a list. Where two relations point at the same value object, set for on each to the name of the attribute it draws. The type itself is free text and is never checked against the value object\'s name; only a trailing [] is read, as "many".',
		check: attributeRelationCoherence,
	},
	{
		rule: "relation-for-resolves",
		severities: ["error"],
		summary:
			"A relation's for names an attribute of the entity or value object that declares the relation.",
		why: "for is how a relation says which attribute it draws, so that a label can stay a phrase where one value object is used twice. A for naming nothing pairs nothing: the attribute has been renamed or removed, or the name written is the target's rather than the source's, and the coherence check silently loses the half it was meant to find.",
		fix: "Write the name of the attribute on this entity or value object that the relation draws, spelled as the attribute is; an attribute a parent declares counts as this one's own. Where the relation is the only one to its target, drop for altogether and the two halves pair by themselves.",
		check: relationForResolves,
	},
	{
		rule: "attribute-one-shape",
		severities: ["error"],
		summary:
			"An attribute is typed by a value object or by a schema, never by both, and only a schema's attribute names a schema.",
		why: "A value object and a schema are two different things to be. A value object is a concept the context models and compares by value; a schema is a payload shape the context publishes to whoever is listening. An attribute claiming both leaves a reader unable to say which model the field belongs to, and a change to either shape becomes a change nobody can scope. For the same reason an entity or a value object holds only value objects: a payload shape belongs at the boundary, and letting one inside puts the vocabulary of the wire into the model the boundary exists to protect.",
		fix: "Keep the value object when the attribute is a concept of the domain, and the schema when it is a nested part of a payload; drop the other. On an entity or a value object, declare the value object the field really is and point at that. Collections stay in the type string, so a list of a nested shape is OrderLine[] beside one schema reference.",
		check: attributeOneShape,
	},
	{
		rule: "invariant-in-value-object",
		severities: ["error"],
		summary:
			"Every element a value object's invariant constrains is an attribute of that value object, or the value object itself.",
		why: "A value is defined by what it holds, and a rule about it is kept by refusing to make one that breaks it: an IBAN whose checksum fails is not a badly configured IBAN, it is not an IBAN. Such a rule needs no save and no guard, and it can only be about what the value carries — a value object knows nothing of the entity holding it, of another value, or of any operation, so a rule naming one of those is a rule the value cannot keep.",
		fix: "Point the invariant at this value object's own attributes. If the rule is really about the thing that holds the value — a transition, a balance across two entities — move it to that aggregate; if it is about several instances at once, it is the context's (decision 27).",
		check: invariantInValueObject,
	},
	{
		rule: "invariant-in-aggregate",
		severities: ["error"],
		summary:
			"An aggregate's invariant holds inside the boundary on every save, so every element it constrains belongs to that aggregate — an entity, an attribute, one of its operations — or is a value object of its context, or one borrowed from elsewhere that something in the aggregate holds, or is an operation of a service of its own context, application or domain, that guards it.",
		why: "An aggregate's invariant is one of two things, and which one is said by whether it names an operation. Naming none, it is the rule the aggregate itself upholds: checked as the aggregate is saved, and true again the moment the save returns. Naming one, it is a guard on that operation — a precondition, checked when the operation runs, and not something the aggregate re-establishes on every save: enough funds at initiation, an entitlement at playback start, a status that may not go backwards. The invariant's page says which of the two it is reading, because the two promise different things. Either way the boundary is the same: something outside it can change between one save and the next with nothing to stop it, so an aggregate cannot promise a rule stretched across two of them. A value object is one exception: it carries no state of its own and is saved as part of whichever aggregate holds one. The boundary holds instances rather than definitions, so a value borrowed over a shared kernel or conformed to upstream is inside it just as one of the context's own is, as long as an entity or a value in the aggregate holds one; a value nobody there holds is not. And a guard is the other: it is usually the aggregate's own operation, but decision 17 puts the public operation on the application service, and a guard that has to read two aggregates before it can say yes belongs to a domain service, so an operation of either kind of service of this context counts.",
		fix: "Move the invariant to the aggregate that owns what it constrains, or drop the foreign target. If the target is a value object from another context, give an entity of this aggregate an attribute typed by it — that is what says the aggregate holds one. If the rule really is about several instances or several aggregates — a uniqueness, a quota, a limit — it belongs to the bounded context instead, where it names the operation that checks it (decision 27). A service's operation, application or domain, is accepted when the service belongs to this aggregate's own context; one from a neighbouring context is not, because nobody here can keep a rule checked next door.",
		check: invariantInAggregate,
	},
	{
		rule: "invariant-in-context",
		severities: ["error"],
		summary:
			"Every element a context's invariant constrains belongs to that context: an entity or attribute of any of its aggregates, one of its value objects or a borrowed one its aggregates hold, or one of its operations.",
		why: "A context's invariant is the rule that holds across its own instances — one open application per customer, one active offer per seller and SKU — and the context can hold it because everything it counts is its own to read in one place. A value borrowed over a shared kernel is its own to read too, once one of its aggregates holds one: the instance is here even though the definition is not. A rule reaching into another context's entities, or into a value nothing here holds, counts what a neighbour owns and may change at any moment, which is a consistency no boundary offers. That rule is a policy or a process reacting to the other context's events instead.",
		fix: "Point the invariant at this context's own model, or at a value object its aggregates hold, or move the rule to the context that owns what it counts. Where the two contexts really must agree, model the reaction: the other context raises an event and a policy here issues the operation that responds.",
		check: invariantInContext,
	},
	{
		rule: "context-invariant-guarded",
		severities: ["error"],
		summary:
			"A context's invariant names at least one operation of that context as a guard.",
		why: "No instance can see its siblings, so nothing enforces a cross-instance rule as a side effect of being saved. It holds only because something checks it before acting: the operation that refuses the second open application, the one that counts the household's open sessions before starting another. Naming that operation is the difference between a rule the model can be read for and a sentence with nowhere to look.",
		fix: "Name the operation that does the checking in constrains, alongside what the rule is about. If no operation checks it, the rule is not being kept: either the check belongs somewhere and has not been modelled, or the rule holds inside one aggregate and belongs there instead.",
		check: contextInvariantGuarded,
	},
	{
		rule: "relationship-roles-backed",
		severities: ["warning"],
		summary:
			"A directed relationship's declared roles are carried by consumables and consumptions crossing between the two contexts — or, for conformist, by the downstream borrowing the upstream's shapes — and a crossing consumption's role is declared on the relationship.",
		why: "The context map and the consumable map are the same integration told twice, strategically and concretely. A role on the map that nothing carries is a claim about a team's way of working with nothing behind it, and a consumption whose role the map never mentions is an integration decision made without the map noticing.",
		fix: "Set the matching pattern on the consumable the downstream context consumes, or on the consumption, or take the role off the relationship if the integration is not really like that. A published-language role is backed by any crossing consumable carrying a schema, since a published language is a data shape rather than a second flag. A conformist role is backed by borrowing too: a downstream naming one of the upstream's schemas or value objects has adopted its model, which is what the role says, so a conformist to a standards body needs no consumption to prove it.",
		check: relationshipRolesBacked,
	},
	{
		rule: "relationship-declared",
		severities: ["warning"],
		summary:
			"Two contexts joined by a crossing — a consumption of the other's consumable, a policy or process reacting to the other's event, or an entity or value object holding an identity that names the other's entity — declare a relationship in that direction.",
		why: "Decision 03 made the relationship the place where the terms of an integration are written: who is upstream, what the provider commits to, whether the consumer translates. A consumption or an identity with no relationship still draws on the context map, as a dashed implied edge, but that edge only says a dependency exists; the relationship is what says on what terms, and it is the thing a team can argue about, comment on and change. A subscription counts because reacting to a neighbour's event is an integration by another route, the same one separate ways forbids and a partnership is backed by; the map draws it through the consumption subscription-consumed requires. An identity counts because since decision 14 it is the only structural record that one context's model depends on another's, even when nothing is consumed — an identity echoed in a payload schema is not that, because the payload carries it for its reader and the context publishing it owes the other nothing.",
		fix: "Declare the relationship the two contexts really have, naming both of them: upstream-downstream or customer-supplier from the provider to the consumer, or a partnership or shared kernel if they meet as equals — either of those counts whichever way round the crossing runs. Separate ways does not count: it says the two do not integrate, so it contradicts the crossing instead of explaining it. If neither context should depend on the other, remove the crossing rather than declaring a relationship for it.",
		check: relationshipDeclared,
	},
	{
		rule: "relationship-duplicate",
		severities: ["error"],
		summary:
			"A pair of contexts declares at most one relationship of each type and direction; a symmetric type has no direction, so either order counts as the same one.",
		why: "A relationship is the one model element with no id of its own — its ref is the two contexts and the type. Declare the same one twice and both carry the same ref, so only the first can ever be reached: the second's description, comments and disposition are written somewhere no reader, link or tool will land, and the model has quietly lost them.",
		fix: "Roles go on one relationship: keep a single declaration between the pair and give it every upstream and downstream role the crossings carry, then delete the other. If the two contexts really do stand in two different ways, one of those ways is a different type of relationship, not a second copy of the same one.",
		check: relationshipDuplicate,
	},
	{
		rule: "relationship-cycle",
		severities: ["warning"],
		summary:
			"The directed relationships whose traffic is calls form no cycle; steps carried only by events, and steps the downstream translates behind an anti-corruption layer, do not count.",
		why: "Downstream means a context shapes its model around what the upstream offers. In a ring of calls the contexts depend on each other's contracts: each one is written against a neighbour's model that is written against its own. Two kinds of step are exempt because neither creates that dependency. Events are one: reacting to a fact commits nobody to another model's shape, and rings of reactions are reaction-cycle's business instead. An anti-corruption layer is the other: the downstream translates at its edge, so the upstream's contract stops there and each side stays free to change, which is the whole point of the pattern.",
		fix: "Put an anti-corruption layer on one of the steps, so that context translates what it calls and can change behind it; or declare a partnership where two of the contexts really do move as one, which says the mutual dependency is deliberate; or reverse a dependency by turning that call into an event the other side reacts to.",
		check: relationshipCycle,
	},
	{
		rule: "partnership-backed",
		severities: ["warning"],
		summary:
			"Two contexts declaring a partnership exchange consumables — or events a policy reacts to — in at least one direction.",
		why: "A partnership says two teams succeed or fail together and plan their releases as one. That is a fact about the teams, not about the direction of the arrows, so traffic one way is enough: one side may consume everything the other publishes and give back nothing, and the joint release train is still real. What the rule will not accept is a partnership with no exchange at all, which is a wish — nothing in the model holds the two contexts together, and the relationship is a claim on the map with nothing under it.",
		fix: "Add the consumable, or the event a policy reacts to, that the partnership is really about; or replace the partnership with the relationship the two contexts actually have — separate ways if they genuinely never meet.",
		check: partnershipBacked,
	},
	{
		rule: "shared-kernel-backed",
		severities: ["warning"],
		summary:
			"Two contexts declaring a shared kernel share something across it: a value object, a schema, or an operation one of them calls on the other.",
		why: "A shared kernel is a piece of model two teams agree to keep in step, and it costs them the freedom to change it alone. Declaring one with nothing in it pays that price for nothing, and it stands in the model as the warrant for a sharing nobody has made: it is one of the two declarations over which a value object or a payload schema may be borrowed, and the only symmetric one — a conformist borrows downstream from its upstream and nothing comes back. Shapes are not the whole kernel, though. Anything in it with identity and behaviour is an aggregate of a kernel context both sides reach through its operations rather than a value either side copies, so calling one of those operations is the sharing too (decision 16).",
		fix: "Type an attribute by a value object the other context declares, nest one of its schemas in an attribute, carry one on a consumable, or consume one of its operations; or replace the shared kernel with the relationship the two contexts really have.",
		check: sharedKernelBacked,
	},
	{
		rule: "conformist-backed",
		severities: ["warning"],
		summary:
			"A downstream that declares the conformist role takes something of its upstream's: a schema or value object named here, something it publishes consumed here, or one of its operations called.",
		why: "Conformist is the strongest thing a downstream can say about itself: it gives up its own language for the upstream's and accepts every change the upstream makes. It is also what lets this context name the upstream's schemas and value objects at all, so a reader takes it as the warrant for a borrowing. Declared between two contexts that exchange nothing at all, it is a claim on the map with nothing under it, exactly as an empty shared kernel or an unbacked partnership is. What the rule does not ask is that the conforming show in the shapes: whether a downstream subscribing to a published event translates it or takes it as it comes is not something the model records, so asking for a borrowed schema would report every event-driven conformist there is.",
		fix: "Consume what the upstream publishes, call one of its operations, or name one of its schemas or value objects here; or drop the conformist role if the two contexts really exchange nothing.",
		check: conformistBacked,
	},
	{
		rule: "mud-needs-acl",
		severities: ["warning"],
		summary:
			"A consumption from a big ball of mud declares the anti-corruption-layer downstream role.",
		why: "A big ball of mud has no coherent model to conform to. Taking its shapes as they come drags its confusion across the boundary, and the consumer's own language starts to look like the legacy one.",
		fix: "Set pattern: anti-corruption-layer on the consumption and translate at the edge, or drop bigBallOfMud if the context is no longer one.",
		check: mudNeedsAcl,
	},
	{
		rule: "term-in-context",
		severities: ["error"],
		summary:
			"A glossary term's embodiedBy names an element of the term's own bounded context.",
		why: "The glossary is one context's ubiquitous language, and the same word means something different in the context next door — that is the whole reason contexts have boundaries. A term pointing outside says the two contexts share a meaning they do not.",
		fix: "Point the term at the element of its own context that embodies it, add the term to the context that owns that element, or leave embodiedBy off when nothing local embodies it.",
		check: termInContext,
	},
	{
		rule: "role-coherence",
		severities: ["warning"],
		summary:
			"A consumable used from another context declares an upstream role, and the consumption declares a downstream role — unless the two contexts are partners or share a kernel.",
		why: "Crossing a context boundary is an integration decision: how the provider offers it (a documented API or a published format) and how the consumer takes it (as-is or translated) should be explicit. Partnership and shared kernel are the exception: neither side is upstream of the other, so there is no role for either end to declare.",
		fix: "Set pattern on the consumable to open-host-service or published-language, and pattern on the consumption to conformist or anti-corruption-layer; or declare the partnership or shared kernel that makes the two contexts equals.",
		check: roleCoherence,
	},
	{
		rule: "separate-ways",
		severities: ["error"],
		summary:
			"Contexts that declare separate ways exchange no consumables, and neither context's policies react to the other's events.",
		why: "Separate ways is a deliberate decision not to integrate; a consumption between the two contradicts it, and a policy subscribing to the other's events is the same integration by another route — the coupling is real whether it is declared as a consumption or reached through a policy.",
		fix: "Remove the consumption or the policy's subscription, or remove the separate-ways relationship and declare the real one.",
		check: separateWays,
	},
	{
		rule: "internal-consumable",
		severities: ["error", "warning"],
		summary:
			"An internal consumable is never consumed, reacted to or issued from another context, and declares no upstream role.",
		why: "internal means the consumable stays inside its context; anything outside depending on it makes that promise false.",
		fix: "Drop internal and give the consumable an upstream role, or stop the other context from using it.",
		check: internalConsumable,
	},
	{
		rule: "consumption-once",
		severities: ["error"],
		summary:
			"A consumer consumes a given consumable once, or several times with each consumption naming callers in by that no other of them names.",
		why: "One pair may carry more than one exchange — an archive taking a provider's response as it stands beside a decision that translates it through an anti-corruption layer, each with its own pattern and disposition — and the callers are what tell them apart. A consumption has no id of its own: its ref is the pair it joins, plus the first caller in by where the pair repeats. So a repeated pair whose consumptions name no caller, or name the same one, produces two consumptions with one ref. Only one of them can ever be reached: the other's pattern, by, comments and disposition are written where no reader, link or tool will land, and any surface keyed by the ref has two rows claiming one key, which is a render crash rather than a model a reader can follow.",
		fix: "Name the callers. Give each consumption of the pair the operations, policies or processes of the consumer that make that exchange, and make sure no caller appears in two of them. If the callers are the same, the two are one exchange: merge them, keeping the pattern, comments and disposition either of them carried.",
		check: consumptionOnce,
	},
	{
		rule: "consumption-by-resolves",
		severities: ["error"],
		summary:
			"A consumption's by names the consumer's own operations, or the policies and processes of the consumer's context.",
		why: "A consumption belongs to the consumer: it is that node saying what it depends on, and by is the detail of which of its own operations or reactions make the exchange. Naming another node's operation would have one part of the model declare behaviour it does not own, and the reader would have no way to check it against the node's own page.",
		fix: "Point by at operations the consumer itself provides, or at the policies and processes of its bounded context, and let the node that really makes the call declare its own consumption. If nothing narrower than the whole consumer is true, drop by — absent means the whole consumer, which is the common case.",
		check: consumptionByResolves,
	},
	{
		rule: "consumption-by-operation",
		severities: ["error"],
		summary:
			"A consumption of an operation names operations in its by; a policy or a process may only be named on a consumption of an event.",
		why: "A subscription is taken in by the reactor itself, with nothing between the fact arriving and the reaction, which is why a policy or a process is allowed there. A call is not like that: a reactor issues an operation of its own context and that operation makes the call (decision 17), and that local operation is where both the flow map and the reaction walk read the boundary. A by naming the reactor skips it — no local operation exists to be drawn, and the chain stops where the caller should have been — while the model reads as though a policy had reached across a boundary itself.",
		fix: "Add the consumer's own operation that makes the call, name it in the reactor's then, and put it in by in place of the reactor. If the reactor really does nothing but subscribe, then what it consumes is the event, not the operation.",
		check: consumptionByOperation,
	},
	{
		rule: "consumption-by-required",
		severities: ["warning"],
		summary:
			"A consumption of another context's operation names, in by, which of the consumer's own operations makes the call — unless the consumer provides fewer than two operations, and so has nothing to choose between.",
		why: "by is the only causal link the model has across a boundary: the flow map and the reaction walk follow it from a local operation through the consumption to the operation it calls and on to what that raises. Without it a lifecycle running through three contexts reads as three unrelated stubs, each stopping at the edge, and the reader is told only that some part of a six-operation service depends on a neighbour — which is barely more than the context map already said.",
		fix: "Name the consumer's own operations that make this call in by. Pick from the operations the message lists; if several of them call out, name them all. A consumer with one operation needs nothing, because that operation is the answer.",
		check: consumptionByRequired,
	},
	{
		rule: "subscription-consumed",
		severities: ["error"],
		summary:
			"A policy or process whose on, starts or ends names another context's event has a consumption of that event somewhere in its own context.",
		why: "Reacting to a neighbour's published fact is an integration, and decision 17 says a subscription is a consumption. Written only as a subscription it is nowhere else in the model: neither the context map nor the consumable map draws the dependency, no downstream role says whether the fact is translated or taken as it comes, and the rules that judge an exchange — the anti-corruption layer a big ball of mud needs, the roles a relationship claims — never see it at all.",
		fix: "Declare the consumption on the service or aggregate that owns the reaction, which is the node providing the operations the reactor issues, and name the policy or process in its by. Give it the downstream role the reaction really has: conformist if the event is taken as published, anti-corruption-layer if something translates it. If the reactor should not depend on that context, react to an event of your own instead.",
		check: subscriptionConsumed,
	},
	{
		rule: "subscription-backed",
		severities: ["warning"],
		summary:
			"A consumed event is reacted to by a policy or a process of the consumer's context, or the consumption names in by which of the consumer's parts it is for.",
		why: "subscription-consumed asks the other half of this question, and between them the two say that a subscription and its reaction are one fact written from two sides. A consumption with neither is a claim with nothing under it: the model says this context takes that fact in, nothing in it does anything when the fact arrives, and the consumable map draws an edge a reader cannot follow anywhere. Usually the reaction was never written down; sometimes the dependency is stale.",
		fix: "Add the policy or process that reacts to the event and the operation it issues, or name in by the consumer's own operation that reads the feed — a projection that updates, a report that accumulates. If nothing here acts on it, delete the consumption: the dependency is not real.",
		check: subscriptionBacked,
	},
	{
		rule: "process-in-context",
		severities: ["error"],
		summary:
			"A process issues operations of its own bounded context; what starts it, what it waits for and what ends it may be another context's events.",
		why: "A process is its context's own way of running something that takes several facts to finish, and like a policy it may only act through its own model: reaching into a neighbour to run an operation there is that context acting through someone else's model rather than through the boundary they published. Listening is different — subscribing to published facts is how contexts integrate — so the events a process starts on, waits for and ends on may cross where the operations it issues may not (decision 23).",
		fix: "Give the process's own context an operation that consumes the foreign one — an application service operation is the usual place — and name that in then.",
		check: processInContext,
	},
	{
		rule: "process-has-ends",
		severities: ["warning"],
		summary: "A process names at least one event that completes an instance.",
		why: "A process is worth its extra weight only because it remembers something between events, and what is remembered has to be forgotten. Without an ending fact a reader cannot tell whether this is a policy wearing a longer name — stateless, one reaction, nothing to wait for — or a real process whose author never said how it finishes, which is also the state nobody can operate or test.",
		fix: "Name the event that means this instance is done in ends — usually one its own then operations raise — or, if nothing is really being waited for, make it a policy again.",
		check: processHasEnds,
	},
	{
		rule: "process-starts",
		severities: ["error"],
		summary: "A process names at least one event that begins an instance.",
		why: "A process has instances, and an instance begins when some fact arrives: without one the model never says when a process exists, so there is nothing to correlate the later events against and nothing for a reader to follow the chain back to.",
		fix: "Put the event that begins an instance in starts. If the process really reacts to anything at any time, it is a policy, not a process.",
		check: processStarts,
	},
	{
		rule: "policy-in-context",
		severities: ["error"],
		summary:
			"A policy issues operations of its own bounded context; it may still react to another context's event.",
		why: "A policy is its context's own rule, and reaching into another context to run an operation there is that context acting through someone else's model rather than through the boundary they published. Reacting is different: subscribing to a published event is how contexts integrate, so a policy's on may cross where its then may not (decision 08's crossing table).",
		fix: "Give the policy's own context an operation that consumes the foreign one — an application service operation is the usual place — and name that in then.",
		check: policyInContext,
	},
	{
		rule: "aggregate-not-public",
		severities: ["error"],
		summary:
			"An aggregate's operations declare no upstream role and are consumed only inside their own context.",
		why: "An aggregate is a consistency boundary, not an integration boundary. When it offers operations outward as well as the application service in front of it, nothing in the model says which of the two is the context's public surface, and a caller outside can change the aggregate without passing the service that guards it. Its events are unaffected: publishing facts is how a context speaks outward.",
		fix: "Mark the aggregate's operation internal: true and drop its pattern, then give the context's application service the public operation that consumes it; point the outside caller at that one.",
		check: aggregateNotPublic,
	},
	{
		rule: "aggregate-consumes-inside",
		severities: ["error"],
		summary:
			"An aggregate consumes only consumables of its own bounded context.",
		why: "An aggregate is a consistency boundary, not a client. A call out of the context is translation, latency and someone else's availability, and none of that belongs inside the transaction that holds an invariant true; an aggregate that waits on a neighbour has made that neighbour part of its consistency boundary. The context's application service owns the use case and calls out, and a policy is how the context reacts to a fact from outside.",
		fix: "Move the consumption to the application service that owns the use case, naming its own operation in by where the caller plainly differs, and let that operation pass the result to the aggregate; for a foreign event, add a policy on that event issuing an operation of this context.",
		check: aggregateConsumesInside,
	},
	{
		rule: "domain-service-consumes-inside",
		severities: ["error"],
		summary:
			"A domain service consumes only consumables of its own bounded context.",
		why: "A domain service is the inside of the model: logic that belongs to no single aggregate, written in this context's own words. Decision 17 keeps it internal in the other direction already — nobody outside may call it — and the outbound half is the same principle. A call across a boundary is translation, failure and waiting on somebody else's availability, and logic that has to do that is not this context's own rule about its own model any more.",
		fix: "Move the consumption to the application service that owns the use case, naming its own operation in by, and let that operation hand the domain service what it needs; for a foreign event, take it in at the application service with the policy or process that reacts to it named in by.",
		check: domainServiceConsumesInside,
	},
	{
		rule: "domain-service-internal",
		severities: ["error"],
		summary:
			"A domain service's operations declare no upstream role and are consumed only inside their own context.",
		why: "A domain service holds domain logic that belongs to no single aggregate — it is the inside of the model, the same as an aggregate. Offering it outward makes another context depend on how this one arranges its logic instead of on what it promises.",
		fix: "Mark the domain service's operation internal: true and drop its pattern, then let the context's application service provide the public operation that consumes it.",
		check: domainServiceInternal,
	},
	{
		rule: "valueobject-context",
		severities: ["error"],
		summary:
			"An attribute types itself by a value object of its own bounded context, of one it shares a kernel with, or of an upstream it has declared itself a conformist of.",
		why: "A value object is part of a bounded context's ubiquitous language: what a Money, a PetStatus or an IBAN means is settled inside one boundary and may be resettled there. An attribute typed by another context's value writes this model in a word somebody else owns, and the day they redefine it this context changes without anybody editing it. A shared kernel is where two teams have said they keep part of one model between them and accepted the price; a conformist is a downstream that takes the upstream's model as it stands. Those are the two places the borrowing is declared, and the rule reads them exactly as schema-context does.",
		fix: "Declare the value object in the context that uses it, in that context's own words; or declare the shared kernel if the two contexts really do keep that value between them; or, if this context takes the other's model as it stands, declare the directed relationship with conformist among its downstreamRoles.",
		check: valueObjectContext,
	},
	{
		rule: "schema-context",
		severities: ["error"],
		summary:
			"A schema named by a consumable's payload, by its returns, by one of its rejections or by a nested attribute belongs to the naming element's own context, to one it shares a kernel with, or to an upstream it has declared itself a conformist of.",
		why: "The context that publishes a message owns its shape; borrowing another context's schema ties the two together so neither can change it alone. A nested schema is the same borrowing one level down. Two declarations say the tie is intended. A shared kernel is where two teams have said they keep part of one model between them and accepted the price. A conformist is a downstream that has said it takes the upstream's model as it stands rather than translating it, which is exactly what carrying the upstream's shapes is — it is how a regulator's formats or a scheme's record layouts enter a model honestly. That borrowing runs downstream only; the upstream is never shaped by its conformists.",
		fix: "Move or copy the schema into the publishing context and point the consumable or attribute at that one; or declare the shared kernel if the two contexts really do keep that shape between them; or, if this context genuinely takes the other's model as it stands, declare the directed relationship with conformist among its downstreamRoles.",
		check: schemaContext,
	},
	{
		rule: "returns-on-operation",
		severities: ["error"],
		summary: "Only an operation declares returns; an event never does.",
		why: "returns names what a caller gets back from a request. An event is a fact already published to whoever is listening; there is no caller to answer, so a returns on one describes an exchange that does not happen.",
		fix: "Drop returns from the event, or change the consumable's type to operation if it really is a request.",
		check: returnsOnOperation,
	},
	{
		rule: "rejects-on-operation",
		severities: ["error"],
		summary: "Only an operation declares rejections; an event never does.",
		why: "A rejection is the shape an operation answers with when it refuses: nothing happened and the caller is told why. An event is a fact that already happened and is announced to whoever is listening, so it has nobody to refuse and nothing left to refuse them.",
		fix: "Drop rejects from the event, or change the consumable's type to operation if it really is a request that can be refused.",
		check: rejectsOnOperation,
	},
	{
		rule: "consumable-kind",
		severities: ["error"],
		summary:
			"Policies and processes react to events and issue operations; only operations raise events, and they raise only events.",
		why: "An event is a fact that happened, an operation is a request to do something; mixing them up makes flows unreadable.",
		fix: "Check the type of each consumable a policy or raises list points at and swap it for the right kind.",
		check: consumableKinds,
	},
	{
		rule: "raises-in-context",
		severities: ["error"],
		summary:
			"An operation raises only events its own bounded context provides.",
		why: "A context publishes its own facts. An event is something that happened inside one boundary, named in that boundary's language, and only the context it happened in is in a position to say so. Raising another context's event claims both that this operation can make a fact true over there and that the neighbour's published event means whatever this one needs — and since the flow map and reaction-cycle read a consumption's by as the causal link across a boundary, a foreign event under raises would fake that link and draw a chain that reaches through the wall.",
		fix: "Raise an event of this context and let the other context react to it, or, if the point is to act over there, consume that context's operation and let it raise its own event.",
		check: raisesInContext,
	},
	{
		rule: "raises-restated",
		severities: ["warning"],
		summary:
			"An operation does not restate under raises an event an operation it calls already raises.",
		why: "An event is raised where it happens, once. When an open-host operation fronts an aggregate's transition and names itself in the consumption's by, the chain already carries that transition's events across to whoever is reading: by is the causal link the flow map draws and reaction-cycle walks. Repeating the event on the front says two things happen instead of one, and the copy is free to drift from what the aggregate actually raises, so the front ends up describing behaviour the aggregate no longer has.",
		fix: "Drop the event from the front's raises and leave it on the operation that really raises it; the chain carries it. If the front genuinely produces its own fact as well, that fact is a different event with its own name.",
		check: raisesRestated,
	},
	{
		rule: "event-unraised",
		severities: ["warning"],
		summary:
			"Every event of a context whose insides are knowable is raised by one of that context's own operations.",
		why: "An event says a fact became true, and the model says what made it true by naming the operation that raises it. An event nothing raises reads as dead model: a reader cannot follow the chain back to the behaviour that causes it, and a policy waiting on it looks like it will never fire. Two contexts are exempt, for the same reason: an external system's insides are not ours to state, and a big ball of mud's cannot be read at all, so a mud context may say what it emits without saying how (decision 28).",
		fix: "Name the operation that raises the event with raises; or, if the fact really comes from outside the business, move the event to the system that emits it and mark that context external: true; or, if it comes out of a legacy system nobody can read, mark that context bigBallOfMud: true rather than inventing the job that emits it.",
		check: eventUnraised,
	},
	{
		rule: "policy-complete",
		severities: ["warning"],
		summary:
			"A policy reacts to at least one event and issues at least one operation.",
		why: "A policy is a rule of the form when this happens, do that; either half missing leaves nothing to enact.",
		fix: "Add the missing event to on or the missing operation to then.",
		check: policyComplete,
	},
	{
		rule: "reaction-cycle",
		severities: ["warning"],
		summary:
			"The reactions form no cycle: no operation raises an event whose policy or process issues an operation that leads back to the first.",
		why: "A ring of reactions runs forever unless something outside the model stops it, and nothing in the model says what that something is. Whoever reads the model next cannot tell whether the loop is a bug or a legitimate retry with a condition that was never written down. A process is walked the same way, with one exemption that is the whole point of it: a process fed by its own steps — it issues an operation, the operation raises the event it waits for next, and so on to the end — is a lifecycle, not a ring, because the process holds state and declares what ends it (decision 23). So a cycle is reported only when the walk comes back to a reactor other than the one process it started from: a ring through two processes, or through a process and a policy, is a genuine loop and is reported.",
		fix: "Break the ring, usually one of the policies is reacting to too broad an event or issues an operation it should not. If the loop is a real feedback loop that converges, say what ends it in the description of the policy that closes the ring; the model has no conditions on purpose (decision 15), so the ending condition is prose a reader finds where the loop closes, and the warning stands to send them there.",
		check: reactionCycle,
	},
	{
		rule: "context-serves-subdomain",
		severities: ["warning"],
		summary: "Every bounded context serves at least one subdomain.",
		why: "A context that serves no subdomain has no place in the problem-space view, so nobody can see which part of the business it exists for.",
		fix: "Add the subdomain the context serves to its subdomains list.",
		check: contextServesSubdomain,
	},
	{
		rule: "external-is-boundary",
		severities: ["error"],
		summary:
			"An external context declares no aggregates, no policies, no processes and no invariants of its own; its value objects may carry invariants, because a standard's published rules are citable.",
		why: "An external context is a system the enterprise does not own: a card scheme, a payment provider, a licensor, a clock. What it offers and what it takes are ours to write down, because we depend on them; how it keeps its own model is not, because we cannot know it and anything the model says about it is invention a reader would take for fact. Its value objects stay, because they are the vocabulary our own model has to carry, and the rules on those values stay with them: an IBAN's mod-97 checksum or an ISO 20022 field rule is the standard's published contract, known and citable, not a guess about somebody's insides. A rule about the context's own instances is different, because that is exactly the invention we cannot make.",
		fix: "Move the aggregate, policy, process or context invariant into the context of ours that actually holds it — a rule about several instances is a rule of the context that keeps them — or drop external: true if this is a system the enterprise really does model inside. A rule that a value of a published standard always satisfies belongs on the value object itself, where it may stay.",
		check: externalIsBoundary,
	},
	{
		rule: "comments-required",
		severities: ["warning"],
		summary:
			"Every context relationship carries at least one comment. Opt-in: set options.rules.commentsRequired on the workspace.",
		why: "A relationship is a claim about how two teams meet; without a note saying where that shows up in the real system, nobody can tell whether the map is still true.",
		fix: "Add a comment to the relationship saying what backs it in the code, or turn options.rules.commentsRequired off while the evidence layer is still being written.",
		check: commentsRequired,
	},
	{
		rule: "disposition-needs-comment",
		severities: ["warning"],
		summary:
			"A strategic intent whose disposition is tolerated or refactor carries at least one comment.",
		why: "by-design says nothing is owed. Any other disposition is a claim that something is wrong, and a claim on its own is not actionable: the next reader cannot tell what makes it wrong, how much it costs, or what would let it be cleared. The comment is where that lives, and without it the disposition is a flag nobody can act on or retire.",
		fix: "Add a comment to the relationship, consumable, consumption or process saying what the trouble is and what clearing it would take, or set the disposition back to by-design if the intent is how it should be after all.",
		check: dispositionNeedsComment,
	},
];

/** The rules `validateWorkspace` applies, described for readers and tooling. */
export const RULE_CATALOG: ReadonlyArray<RuleDescription> = RULES.map(
	({ check: _check, ...description }) => description,
);

/** Checks a workspace against the DDD rules ODS can verify structurally. */
export function validateWorkspace(workspace: Workspace): Diagnostic[] {
	return RULES.flatMap((rule) => rule.check(workspace));
}
