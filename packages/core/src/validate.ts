import {
	dispositionOf,
	intentsWithoutComments,
	relationshipsWithoutComments,
	type StrategicIntent,
} from "./evidence";
import {
	attributeOwnersIn,
	identityCrossings,
	identityNamed,
} from "./identity-crossings";
import {
	hearsAnswerOf,
	ReactionChain,
	type Reactor,
	reachedEvents,
	routesTo,
} from "./reaction-walk";
import { type DownstreamRole, ODS_VERSION, type UpstreamRole } from "./schema";
import {
	Aggregate,
	Answer,
	Attribute,
	type AttributeOwner,
	BoundedContext,
	type Constrainable,
	Consumable,
	Consumption,
	ContextRelationship,
	constrainableLabel,
	DataSchema,
	Deadline,
	Entity,
	type EntityRelation,
	type Invariant,
	isDirectedRelationshipType,
	Policy,
	Process,
	type ProcessTrigger,
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
 *
 * A trigger named twice — an event or answer that both starts, keeps alive or
 * ends the same process instance — is the same object wherever it is named
 * (`Answer`'s own doc says so, and a consumable is loaded once), so a `Set`
 * collapses it to one and every rule that walks this list reports it once
 * rather than once per list it appears in.
 */
function subscribedTriggers(reactor: Policy | Process): ProcessTrigger[] {
	return reactor instanceof Process
		? [
				...new Set([
					...reactor.startEvents,
					...reactor.events,
					...reactor.endEvents,
				]),
			]
		: reactor.events;
}

/**
 * The operations a process starts on: the commands that create an instance.
 *
 * A command starts a saga as often as an event does — "open a claim", "submit
 * an application" — so `starts` may name one of the process's own operations
 * (decision 23, third amendment). It is the one thing in a reactor's lists
 * that is neither a subscription nor something the reactor issues, so it is
 * separated here and every rule about subscriptions is told to ignore it.
 */
function startingCommands(reactor: Policy | Process): Consumable[] {
	return reactor instanceof Process
		? reactor.startEvents.filter((it) => it.type === "operation")
		: [];
}

/**
 * The consumables a policy or a process waits for, which is what every rule
 * about a subscription is about: an event is published by a provider in a
 * context, and that is what makes it a crossing, an internal consumable or the
 * wrong kind of thing to react to. An answer is none of those — it is a shape,
 * and what carries it is the operation the reactor's own context already
 * consumes — so it is left to `consumable-kind`, which is where the model says
 * what an answer has to be (decision 23, second amendment). A deadline is none
 * of those either, and crosses nothing at all: it is the process's own timer,
 * so no boundary, no provider and no subscription is involved.
 *
 * A command a process starts on is none of them either. Nobody subscribes to a
 * command: it is issued, by whoever creates the instance, and it belongs to
 * the process's own context (`process-in-context`), so there is no boundary
 * for a subscription rule to have an opinion about (see
 * {@link startingCommands}).
 */
function subscribedEvents(reactor: Policy | Process): Consumable[] {
	const starting = new Set<Consumable>(startingCommands(reactor));
	return subscribedTriggers(reactor).filter(
		(it): it is Consumable => it instanceof Consumable && !starting.has(it),
	);
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
 * maps draw the dependency on that context.
 *
 * A big ball of mud is named the same way and for the same reason. It is the
 * enterprise's own system, so it may state aggregates and every rule about
 * what it does state applies; what it cannot be held to is completeness, which
 * is why {@link knowableContexts} lets it name a cluster without a root. An id
 * out of a forty-year-old core banking system — a customer number, a legacy
 * account key — is exactly the fact nobody can trace to an entity in there,
 * and demanding one invites an invented aggregate (decision 28, second
 * amendment; card 98). Any other context is refused, because there the entity
 * does exist and is what the id is of — naming the whole context instead would
 * say less than the model already holds.
 *
 * An external context often publishes more than its name: a payment processor
 * documents Customer, Payment, Refund and Dispute as distinct kinds with
 * distinct ids, and those kinds are its published schemas. An identity may
 * name one of them, and the model reads it as an identity into that context
 * naming that kind; the context itself stays the target where nothing is
 * published for the id. A schema of any other context is refused for the same
 * reason the context is: where the model states the insides, the id is of an
 * entity and the entity is what to name (decision 28, third amendment of
 * 2026-09-10; card 113). A big ball of mud publishes nothing anyone can rely
 * on — that is what makes it one — so its schemas are not identity targets and
 * its ids name the context.
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
				if (target.external || target.bigBallOfMud) continue;
				diagnostics.push({
					severity: "error",
					rule: "identifies-entity",
					message: `"${owner.name}" holds attribute "${attribute.name}" as the identity of bounded context "${target.name}", which is neither external nor a big ball of mud; a context whose insides the model states has the entity the id is of, so name that entity instead`,
					ref: attribute.ref,
				});
				continue;
			}
			if (target instanceof DataSchema) {
				if (target.boundedcontext.external) continue;
				diagnostics.push({
					severity: "error",
					rule: "identifies-entity",
					message: `"${owner.name}" holds attribute "${attribute.name}" as the identity of schema "${target.name}" of bounded context "${target.boundedcontext.name}", which is not external; a published schema is a kind a system outside the model documents, so name the entity the id is of, or that system's context where its entities are not ours to state`,
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
			// A value object that includes or references anything is
			// value-object-shape's, and both kinds land on an entity.
			if (!(member instanceof Entity)) continue;
			if (relation.target instanceof Entity) continue;
			// `includes` says whole-part inside the boundary and `references`
			// says "that one over there", and both are about entities. A value
			// has no identity to point at and no life of its own to be part of,
			// so the only thing either could mean is that the holder uses it.
			// The mirror of `uses` onto an entity, refused for the same reason
			// (card 100).
			const said =
				relation.relation === "includes"
					? '"includes" points at an entity the aggregate owns'
					: '"references" points at an entity in another aggregate, and a value has no identity to point at';
			diagnostics.push({
				severity: "error",
				rule: "aggregate-tree",
				message: `"${member.name}" ${relation.relation} "${relation.target.name}", which is a value object; ${said}. A value object is used`,
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
 * A `uses` relation declared for an attribute says the same as the attribute
 * about how many there are and whether there is one at all.
 *
 * The line itself is not asked for. An attribute typed by a value object is a
 * dependency on that value, and the relation map draws it from the attribute
 * whether or not a relation is written — as it always has for a value borrowed
 * from another context, where no relation may be declared at all (decision 16,
 * note of 2026-09-10). A declared relation adds a label or a cardinality to
 * that line, and what this rule checks is that what it adds is true. Demanding
 * the declaration made the reference models write the pair out hundreds of
 * times and told an author to restate a fact the model already had.
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
 * rather than guessed, because the map cannot draw a line it cannot pair
 * either (see {@link Attribute.drawnBy}).
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
			// A relation may not leave the context, so only a value object of
			// this one can have a declared relation to disagree with; a borrowed
			// value is drawn from the attribute alone (decision 16, third
			// amendment).
			if (!vo || vo.boundedcontext !== context) continue;
			const candidates = usesOfValueObject(member.allRelations, vo);
			// Nothing declared is the ordinary case now: the line is derived.
			if (candidates.length === 0) continue;
			const relation = attribute.drawnBy;
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
 * sits in neither, so it is out of reach here and asked about separately (see
 * {@link inGuardedShapes}); so is a service's operation, since a service is
 * not a boundary anything is saved inside.
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

/**
 * Every schema reachable from these, following `attribute.schema` as far as it
 * goes: the shapes nested inside a payload are part of that payload.
 *
 * Composition is a schema's own business (decision 18), so a request that
 * carries lines carries their fields too — an order's `lines` typed by
 * `OrderLine` puts `OrderLine.amount` in the call as surely as a top-level
 * field. A rule about the amount of a line is a rule about the request that
 * holds the lines, and reading only the top level refused it (card 99).
 *
 * The queue is walked with a `for...of` over a growing array, which reads its
 * length each step, so nesting is followed to the end; `reached` makes a cycle
 * of schemas terminate rather than hang.
 */
function composedSchemas(roots: Iterable<DataSchema>): Set<DataSchema> {
	const reached = new Set<DataSchema>(roots);
	const queue = [...reached];
	for (const schema of queue) {
		for (const attribute of schema.attributes.values()) {
			const nested = attribute.schema;
			if (!nested || reached.has(nested)) continue;
			reached.add(nested);
			queue.push(nested);
		}
	}
	return reached;
}

/**
 * What a guard has already been told: the shapes the calls made for this
 * operation answered with.
 *
 * A precondition is checked at the moment of the call, and a check that reads
 * something from another context reads an answer, not that context's model.
 * "Approve an order only if the customer is in good standing" is one call
 * before the decision — the front asks the customers context and holds the
 * standing it came back with — so the fact the rule names is the `returns` of
 * the consumable that call consumed. Naming it is the difference between a
 * rule a reader can follow to the call that feeds it and a sentence saying
 * "somewhere we look this up".
 *
 * Two ways a call belongs to a guard, and both are `by` read as the causal
 * link it is (decision 21's amendment). The guard makes the call itself: its
 * own provider's consumption names it in `by`. Or the front that calls the
 * guard makes it: a public operation of this same context that reaches the
 * guard through a consumption naming the front, which is decision 17's shape —
 * the aggregate keeps the rule and the application service is what talks to
 * anybody, so the aggregate's operation never holds the consumption itself.
 * Only calls declared inside the guard's own context count: a consumption is
 * the consumer's, and a rule of ours may not be fed by somebody else's call.
 */
function fetchedByGuard(guard: Consumable): DataSchema[] {
	const bc = guard.boundedcontext;
	const members = [...bc.aggregates.values(), ...bc.services.values()];
	const consumptions = members.flatMap((member) => member.consumptions);
	// The fronts: operations of this context whose own call reaches the guard.
	const fronts = new Set<Consumable | Policy | Process>(
		consumptions
			.filter((c) => c.consumable === guard)
			.flatMap((c) => c.by)
			.filter((caller): caller is Consumable => caller instanceof Consumable),
	);
	const answers: DataSchema[] = [];
	for (const consumption of consumptions) {
		const { returns } = consumption.consumable;
		if (!returns) continue;
		if (!consumption.by.some((by) => by === guard || fronts.has(by))) continue;
		if (!answers.includes(returns)) answers.push(returns);
	}
	return answers;
}

/**
 * The payload shapes this invariant's guarded operations put within its reach,
 * composition included.
 *
 * A precondition is checked before the call runs, so what it can read is what
 * has arrived: the request, and the shapes the request composes. The answer
 * has not been computed and the refusals have not been chosen, so a rule that
 * names one is not a check anybody could make — it is a guarantee about what
 * comes back, which is what `postcondition` is for. Reading all three for both
 * flags let a precondition constrain an attribute of a shape that does not
 * exist when it runs (card 104).
 *
 * A postcondition reaches all three, because what it guarantees is a relation
 * between the answer and the request that produced it: every returned
 * itinerary arrives by the requested time names one attribute of each, and
 * reading the answer alone refused the very example the flag was introduced
 * for (decision 19, third amendment).
 *
 * A precondition reaches one place further still: what the guard already
 * fetched. "Approve only if the customer is in good standing" is checked
 * before the approval runs and the standing it reads is not in the request and
 * not this operation's answer — it is the answer of a call somebody here made
 * first, over an anti-corruption layer, before deciding. That answer exists at
 * the moment of the check, so the rule may name it, and until card 116 it
 * could name neither that nor the other context's attribute and had to leave
 * what it reads in prose. What it reaches is the `returns` of the consumables
 * the guard itself consumes, or that the front calling the guard consumes (see
 * {@link fetchedByGuard}); the other context's entities stay out of reach, as
 * they always were (decision 19, amendment of 2026-09-10, second).
 */
function guardedSchemas(invariant: Invariant): Set<DataSchema> {
	const roots: DataSchema[] = [];
	for (const operation of invariant.guarded) {
		if (operation.type !== "operation") continue;
		if (operation.schema) roots.push(operation.schema);
		if (invariant.precondition) roots.push(...fetchedByGuard(operation));
		if (!invariant.postcondition) continue;
		if (operation.returns) roots.push(operation.returns);
		roots.push(...operation.rejects);
	}
	return composedSchemas(roots);
}

/**
 * Whether a target is an attribute of a shape one of this invariant's guarded
 * operations carries, or of a shape one of those composes.
 *
 * A precondition is checked before the call runs, and often what it checks is
 * in the call: pickup before delivery, a positive weight, on a quotation no
 * aggregate holds yet. The rule is about the request, so the request is what
 * it names — and only the request, because nothing else has happened yet
 * (decision 19, amended). A postcondition is a guarantee about the answer,
 * which does not exist until the call returns — and a guarantee that relates
 * the answer to what was asked for, so it names the request as well: every
 * returned itinerary arrives by the requested time (decision 19, third
 * amendment). Nothing else may name a schema's attribute at all: an invariant
 * kept true on every save is a rule about the model, and a transport shape is
 * not the model.
 */
function inGuardedShapes(target: Constrainable, invariant: Invariant): boolean {
	if (!invariant.precondition && !invariant.postcondition) return false;
	const schema = schemaOf(target);
	if (!schema) return false;
	return guardedSchemas(invariant).has(schema);
}

/** The schema a target is an attribute of, when it is one. */
function schemaOf(target: Constrainable): DataSchema | undefined {
	return target instanceof Attribute && target.owner instanceof DataSchema
		? target.owner
		: undefined;
}

/**
 * Why a schema's attribute is out of reach, which is not one sentence twice: a
 * rule that is neither a precondition nor a postcondition may not name a
 * transport shape at all, a postcondition may name only the shapes its own
 * guard carries, and a precondition only the request among them. The
 * postcondition is asked first so that the sentence matches the reach where a
 * model has claimed both flags, which `postcondition-names-operation` reports
 * separately.
 */
function schemaAttributeRefusal(
	schema: DataSchema,
	invariant: Invariant,
): string {
	const where = `an attribute of schema "${schema.name}"`;
	if (invariant.postcondition)
		return `${where}, which no operation this postcondition guards takes, returns or rejects with, directly or through a shape one of those composes`;
	if (invariant.precondition)
		return `${where}, which is neither in the request of an operation this precondition guards nor in what a call that guard makes answers with, directly or through a shape one of those composes; a precondition reads what it has by the time it runs — the request, and what the guard or the front that calls it already fetched — and not what this call comes back with`;
	return `${where}, and only a precondition or a postcondition may constrain one — a rule kept true on every save is a rule about the model, not about a transport shape`;
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
 * Everything a value object's own invariant may constrain: the value, its
 * attributes — its own and inherited — and, through any attribute typed by
 * another value object, that value and its attributes in turn, as far as the
 * composition runs.
 *
 * A value is made whole, and what it is made of is made with it: an itinerary
 * is constructed from its legs, so a rule that each leg's arrival precedes the
 * next leg's departure holds by construction of the itinerary exactly as a
 * Money's same-currency rule holds by construction of the Money. Reading only
 * the owner's own attributes forced such a model to flatten its legs into the
 * itinerary to state a rule the business states plainly (decision 27, amended
 * 2026-09-10; card 113). The walk follows composition and nothing else, so an
 * entity, an operation or a value nobody on the path holds stays out of reach.
 */
function compositionReachOf(vo: ValueObject): Set<Constrainable> {
	const reach = new Set<Constrainable>();
	const held = [vo];
	const seen = new Set<ValueObject>(held);
	// `held` grows as attributes name further values, and a `for...of` over an
	// array reads its length each step, so the walk follows composition to the
	// end. A value that holds itself, directly or round a ring, is visited once.
	for (const value of held) {
		reach.add(value);
		for (const attribute of value.allAttributes) {
			reach.add(attribute);
			const composed = attribute.valueobject;
			if (!composed || seen.has(composed)) continue;
			seen.add(composed);
			held.push(composed);
		}
	}
	return reach;
}

/**
 * A value object's invariant is a rule about that value and what it is made
 * of, and nothing else: a Money's two amounts in one currency, an IBAN's
 * mod-97 checksum, an Itinerary's legs in time order. It holds by
 * construction, because a value that breaks it is never made, so it needs no
 * guard and it may not reach for an entity, an operation or a value nothing on
 * its composition path holds — anything further would be a rule about
 * something the value cannot see, and that rule belongs to the aggregate or
 * the context (decision 27, amended 2026-09-10).
 */
const invariantInValueObject: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const [vo, invariant] of valueObjectInvariantsOf(workspace)) {
		const reach = compositionReachOf(vo);
		for (const target of invariant.targets) {
			if (reach.has(target)) continue;
			diagnostics.push({
				severity: "error",
				rule: "invariant-in-value-object",
				message: `Invariant "${invariant.name}" of value object "${vo.name}" constrains "${constrainableLabel(target)}", which is neither an attribute of "${vo.name}" nor one of a value "${vo.name}" is made of; a value's rule holds by construction of that value and reaches only along what it composes`,
				ref: invariant.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * Where a target of an aggregate's invariant is, said in the words that follow
 * "which is": the four ways something can be outside the boundary, each with
 * the fact a reader needs to move it back inside.
 */
function outsideAggregate(
	target: Constrainable,
	aggregate: Aggregate,
	invariant: Invariant,
): string {
	const vo = valueObjectOf(target);
	if (vo)
		return `a value object of bounded context "${vo.boundedcontext.name}" that nothing in "${aggregate.name}" holds`;
	const service =
		target instanceof Consumable && !(target.provider instanceof Aggregate)
			? target.provider
			: undefined;
	if (service)
		return `${service.type === "application" ? "an application" : "a domain"} service's, on "${service.name}" in bounded context "${service.boundedcontext.name}"`;
	const schema = schemaOf(target);
	if (schema) return schemaAttributeRefusal(schema, invariant);
	const scope = scopeOf(target);
	return `in ${
		scope
			? `${scope instanceof Aggregate ? "aggregate" : "bounded context"} "${scope.name}"`
			: "no aggregate at all"
	}`;
}

/**
 * An aggregate's invariant holds inside its boundary, so everything it
 * constrains has to be inside that aggregate — or be a value object of the
 * aggregate's own context, which is saved as part of whichever aggregate holds
 * one (decision 16). An operation of the same aggregate is inside it too: a
 * transition rule is a rule about what that operation may do, and naming it is
 * how the model says which change the rule guards (decision 19).
 *
 * Naming one says which operation keeps the rule, and nothing more. What kind
 * of rule it is, the invariant states with `precondition`: set, it is checked
 * before that operation runs and nothing re-establishes it afterwards, because
 * what it was checked against — a balance, an entitlement, another context's
 * answer — may have moved on by the next save; unset, the operation is named
 * for responsibility and the rule is still true after it, as balanced postings
 * are after `PostEntry`. Inferring the one fact from the other conflated them
 * (decision 27, second amendment).
 *
 * A value object is inside the boundary as long as an entity or a value inside
 * the aggregate holds one: what is saved with the aggregate is the value, not
 * the definition, and where the definition lives — this context, a shared
 * kernel, an upstream the context conforms to — says nothing about which
 * aggregate holds an instance. A value nobody inside the aggregate holds is
 * refused, and that is the one question asked about any value object,
 * borrowed or the context's own. Until card 95 a value of the aggregate's own
 * context was let through unheld, because a value belongs to the whole context
 * and the check that reads scopes accepted it before the holding was looked
 * at — so the rule refused a borrowed `Money` nothing held and accepted a
 * local one, having said in this comment that it refused both (card 89).
 *
 * The last thing inside is an operation of a service of the same context,
 * application or domain, when that operation is the guard: a precondition is
 * checked at the moment of the call, and decision 17 put the public operation
 * on the application service, while a rule that reads two aggregates before
 * acting lives in a domain service, so the model has to be able to name either
 * (see {@link guardedByService}).
 *
 * A precondition and a postcondition reach one place further, into the shapes
 * the call carries: what a precondition checks before the call runs is often
 * in the request, so it may constrain attributes of the schema its guarded
 * operation takes; and what a postcondition guarantees of the answer is often
 * stated against the request that asked for it, so it may constrain the
 * request, the answer and the refusals (see {@link inGuardedShapes}). Any
 * other invariant naming a schema's attribute is refused, and told which of
 * the reasons it is.
 *
 * A precondition reaches what the guard fetched as well as what it was sent:
 * "approve only if the customer is in good standing" reads a standing that
 * came back from another context before this call began, and the shape it came
 * back in is the one the rule names (see {@link fetchedByGuard}). What stays
 * out of reach is that context's own entities and attributes: an answer we
 * were given is a fact we hold, and their model is not (decision 19,
 * amendment of 2026-09-10, second).
 */
const invariantInAggregate: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of aggregatesOf(workspace)) {
		if (aggregate.invariants.size === 0) continue;
		const held = valueObjectsHeldIn(aggregate);
		for (const invariant of aggregate.invariants.values()) {
			for (const target of invariant.targets) {
				const vo = valueObjectOf(target);
				const scope = scopeOf(target);
				// A value object is asked one question and no other: does
				// anything inside this aggregate hold one? Its scope is the
				// context whichever context declared it, so reading the scope
				// first would answer "inside the boundary" for every value the
				// context owns, held or not.
				if (vo) {
					if (held.has(vo)) continue;
				} else {
					if (scope === aggregate || scope === aggregate.boundedcontext)
						continue;
					if (guardedByService(target, aggregate.boundedcontext)) continue;
					if (inGuardedShapes(target, invariant)) continue;
				}
				diagnostics.push({
					severity: "error",
					rule: "invariant-in-aggregate",
					message: `Invariant "${invariant.name}" of aggregate "${aggregate.name}" constrains "${constrainableLabel(target)}", which is ${outsideAggregate(target, aggregate, invariant)}; an aggregate's invariant holds inside the boundary on every save. Outside it, a rule may name an operation of a service of its own context that guards it, and — where it is a precondition or a postcondition — the attributes of the shapes that operation carries, a precondition also reading what the guard or the front that calls it fetched before deciding`,
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
 * one aggregate (decision 27). A schema's attribute belongs to no context here
 * — the rules ask {@link inGuardedShapes} about it instead, since only a
 * precondition or a postcondition may reach one.
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
 * nobody in the context holds is refused, and that is the one question asked
 * about any value object, borrowed or the context's own. Until card 96 a
 * value of the context's own was let through unheld, because the check that
 * reads the declaring context accepted it before the holding was looked at —
 * so the rule refused a borrowed `Money` nothing held and accepted a local
 * one, having said in this comment that it refused both (card 89, card 95).
 *
 * A precondition or a postcondition of the context may constrain the shapes
 * its guard carries, on the same terms an aggregate's may (see
 * {@link inGuardedShapes}). A context with no aggregate at all — a quotation
 * service that stores nothing — states the contract of its own operation that
 * way, which is the only home it has for one (decision 27, third amendment).
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
			const vo = valueObjectOf(target);
			// A value object is asked one question and no other: does anything
			// in this context hold one? Its context is whichever context
			// declared it, so reading that first would answer "inside the
			// boundary" for every value this context owns, held or not.
			if (vo) {
				if (held.has(vo)) continue;
			} else if (context === bc || inGuardedShapes(target, invariant)) continue;
			const schema = schemaOf(target);
			const where = vo
				? `a value object of bounded context "${vo.boundedcontext.name}" that nothing in "${bc.name}" holds`
				: schema
					? schemaAttributeRefusal(schema, invariant)
					: `in ${context ? `bounded context "${context.name}"` : "no bounded context at all"}`;
			diagnostics.push({
				severity: "error",
				rule: "invariant-in-context",
				message: `Invariant "${invariant.name}" of bounded context "${bc.name}" constrains "${constrainableLabel(target)}", which is ${where}; a context's invariant holds across its own aggregates and no further — where the two contexts really must agree, the rule is a policy or a process of "${bc.name}" that reacts to the other context's event instead`,
				ref: invariant.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * A context's invariant is a check, and a check happens at a moment: it names
 * the operation that makes it.
 *
 * One open application per customer, a daily transfer limit, one active offer
 * per seller and SKU: no instance can see its siblings, so nothing enforces
 * such a rule as a side effect of being saved, and a count can race. It holds
 * only because something checks it — the operation that refuses the second
 * open application, the one that counts the household's open sessions before
 * starting another. Naming that operation is the difference between a rule the
 * model can be read for and a sentence with nowhere to look.
 *
 * Which side of the operation the check falls on is the invariant's to say.
 * `precondition` says it is made on the way in — enough funds at initiation, a
 * positive weight on a quotation no aggregate holds yet. `postcondition` says
 * it is made of what comes back — every quoted premium inside the band the
 * schedule allows. Both were refused here until card 103, on the reasoning
 * that a context's rule is always a check and therefore needs no flag; that
 * left a context with no aggregate, a quotation service that stores nothing,
 * with no way to state the contract of its own operation. Neither flag claims
 * the rule holds at rest, so neither is refused (decision 27, third
 * amendment).
 *
 * What stays refused is a context invariant that names no guard at all, and
 * this rule reports it for the invariant that sets no flag. A flagged one is
 * held to the same thing by `precondition-names-operation` and
 * `postcondition-names-operation`, so reporting it here as well would say one
 * fact twice.
 *
 * An error, because the model states a rule nothing keeps.
 */
const contextInvariantIsChecked: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const [bc, invariant] of contextInvariantsOf(workspace)) {
		if (invariant.precondition || invariant.postcondition) continue;
		const guards = invariant.guarded.filter(
			(it) => it.type === "operation" && it.boundedcontext === bc,
		);
		if (guards.length > 0) continue;
		diagnostics.push({
			severity: "error",
			rule: "context-invariant-is-checked",
			message: `Invariant "${invariant.name}" of bounded context "${bc.name}" names no operation that checks it; a rule across the instances of a context is kept true only by an operation that checks it, before it acts or of what it answers with`,
			ref: invariant.ref,
		});
	}
	return diagnostics;
};

/** Every invariant in the workspace, whatever it belongs to. */
function* invariantsOf(workspace: Workspace): Iterable<Invariant> {
	for (const bc of modelledContexts(workspace)) {
		yield* bc.invariants.values();
		for (const vo of bc.valueobjects.values()) yield* vo.invariants.values();
		for (const aggregate of bc.aggregates.values())
			yield* aggregate.invariants.values();
	}
}

/**
 * A precondition is checked before one operation runs, so it has to say which
 * one. Without a guard the flag says a rule is not kept true afterwards and
 * names no moment at which it was ever checked, which leaves a reader with a
 * sentence and nowhere to look (decision 27, second amendment).
 */
const preconditionNamesOperation: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const invariant of invariantsOf(workspace)) {
		if (
			!invariant.precondition ||
			invariant.guarded.some((it) => it.type === "operation")
		)
			continue;
		diagnostics.push({
			severity: "error",
			rule: "precondition-names-operation",
			message: `Invariant "${invariant.name}" is marked a precondition but names no operation; a precondition is checked before something runs, so say what`,
			ref: invariant.ref,
		});
	}
	return diagnostics;
};

/**
 * A postcondition is a guarantee about what one operation answers with, so it
 * has to say which operation, and it is not also a precondition.
 *
 * The two are different promises about different moments. A precondition is
 * checked before the call, against something that may have moved by the time
 * it returns; a postcondition holds of what the call comes back with, which
 * did not exist before it ran. A rule marked both says its own subject is two
 * things at once, and every reader of the flag — the page that names the kind,
 * the reach the rule is allowed over a payload — has to pick one and would
 * pick differently. Named without a guard, a postcondition is worse off than a
 * precondition without one: there is not even a call whose answer it could be
 * about (decision 19, third amendment).
 */
const postconditionNamesOperation: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const invariant of invariantsOf(workspace)) {
		if (!invariant.postcondition) continue;
		if (invariant.precondition) {
			diagnostics.push({
				severity: "error",
				rule: "postcondition-names-operation",
				message: `Invariant "${invariant.name}" is marked both a precondition and a postcondition; a rule is checked before a call or guaranteed of what comes back, and one that is both says two things about when it holds`,
				ref: invariant.ref,
			});
			continue;
		}
		if (invariant.guarded.some((it) => it.type === "operation")) continue;
		diagnostics.push({
			severity: "error",
			rule: "postcondition-names-operation",
			message: `Invariant "${invariant.name}" is marked a postcondition but names no operation; a postcondition is a guarantee about what a call answers with, so say which call`,
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
 * Whether `downstream` has declared the given role toward `upstream`: a
 * directed relationship from the one to the other whose `downstreamRoles`
 * carry it (decision 03).
 *
 * The direction is the whole of it. A downstream is the side that takes the
 * other's model — as it stands, or translated — so the borrowing runs
 * downstream from upstream and never the other way: the upstream owes the
 * downstream nothing and must not be shaped by it.
 */
function downstreamRoleToward(
	workspace: Workspace,
	downstream: BoundedContext,
	upstream: BoundedContext,
	role: DownstreamRole,
): boolean {
	return workspace.relationships.some(
		(r) =>
			isDirectedRelationshipType(r.type) &&
			r.source === upstream &&
			r.target === downstream &&
			r.downstreamRoles.includes(role),
	);
}

/** Whether `downstream` has declared itself a conformist of `upstream`. */
function conformsTo(
	workspace: Workspace,
	downstream: BoundedContext,
	upstream: BoundedContext,
): boolean {
	return downstreamRoleToward(workspace, downstream, upstream, "conformist");
}

/**
 * Whether `downstream` has declared an anti-corruption layer toward
 * `upstream`: it translates the upstream's language at its own boundary.
 *
 * Upstream is who dictates the model, not who provides the consumable
 * (decision 03's 2026-09-09 amendment). A card processor that calls the bank
 * in its own format, an EDI partner, an HL7 orderer: each dictates the shape
 * of the request, and the context it calls is downstream of it however much
 * of the traffic runs the other way. What that context translates at its
 * boundary is the caller's language, so the foreign shape is carried on the
 * operation the caller reaches and nowhere else.
 */
function translatesFrom(
	workspace: Workspace,
	downstream: BoundedContext,
	upstream: BoundedContext,
): boolean {
	return downstreamRoleToward(
		workspace,
		downstream,
		upstream,
		"anti-corruption-layer",
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

/**
 * Whether this consumable is the boundary an anti-corruption layer translates:
 * it carries a shape `caller` declares, and `caller` is what consumes it.
 *
 * This is the case the model had no room for. Upstream is who dictates the
 * language, so a context whose caller sends its own format is downstream of
 * that caller, and what it offers at the boundary is an operation in the
 * caller's shape with the translation behind it. That is not conforming — the
 * model inside is the downstream's own and stays its own, which is the whole
 * point of the layer — and refusing the foreign shape left the truthful form
 * unwritable: NorthBank inverted the call into an event nobody makes, so
 * nothing consumed the operation the processor actually calls (decision 03,
 * 2026-09-09; card 98).
 *
 * Both halves are needed, and the second is what keeps the exception honest. A
 * layer excuses the shape on the one consumable the caller reaches, not on
 * everything the downstream publishes: a context that puts a neighbour's schema
 * on a fact of its own has written its model in somebody else's words, whoever
 * happens to read it, and that is the borrowing this rule exists to refuse.
 */
function translatesForCaller(
	consumable: Consumable,
	caller: BoundedContext,
): boolean {
	const carries =
		consumable.schema?.boundedcontext === caller ||
		consumable.returns?.boundedcontext === caller ||
		consumable.rejects.some((it) => it.boundedcontext === caller);
	return (
		carries &&
		consumable.consumptions.some((c) => c.consumer.boundedcontext === caller)
	);
}

/**
 * Whether a consumable of `carrier`'s may carry a payload shape `owner`
 * declares: everything {@link mayBorrowFrom} allows, and the operation an
 * upstream caller reaches through an anti-corruption layer.
 *
 * A consumable only, and deliberately. The layer is at the boundary, and a
 * consumable is the boundary; an attribute nesting a foreign schema is inside
 * the model, where a translation has already happened or should have, so
 * attributes keep {@link mayBorrowFrom}'s narrower reading.
 */
function mayCarrySchemaFrom(
	workspace: Workspace,
	carrier: BoundedContext,
	owner: BoundedContext,
	consumable: Consumable,
): boolean {
	return (
		mayBorrowFrom(workspace, carrier, owner) ||
		(translatesFrom(workspace, carrier, owner) &&
			translatesForCaller(consumable, owner))
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
 * Whether a relationship accounts for a crossing between two contexts.
 *
 * Direction is not asked about. A directed relationship's direction is the
 * author's strategic claim — who dictates the model — and not a statement
 * about which way the traffic runs: a card processor that calls the bank in
 * its own format is upstream of the bank though the bank provides the
 * operation (decision 03, 2026-09-09). Reading the arrow as the call's meant
 * that the truthful relationship did not satisfy the rule and a second,
 * false one had to be declared beside it to quieten the warning, which is
 * exactly what NorthBank had done. So a relationship joining the two contexts
 * answers the question the crossing raises — on what terms do these two
 * stand? — whichever way it points.
 *
 * Separate ways counts too, though it explains nothing: the question this rule
 * asks is whether the pair has been described at all, and a pair that has
 * declared separate ways has been. What is wrong there is that the crossing
 * contradicts the declaration, which is `separate-ways`'s sentence and an
 * error; saying beside it that no relationship describes the pair is simply
 * untrue, and NorthBank's deliberate quick-quote case carried both for four
 * cards (card 104).
 */
function relationshipJoins(
	workspace: Workspace,
	one: BoundedContext,
	other: BoundedContext,
): boolean {
	return workspace.relationships.some(
		(r) => r.involves(one) && r.involves(other),
	);
}

/**
 * Every crossing between two contexts has a relationship saying how they
 * stand to each other.
 *
 * Decision 03 made relationships explicit and decision 08 promised this rule.
 * A crossing is a consumption of another context's consumable, a policy or a
 * process reacting to another context's event or to the answer one of its
 * operations comes back with, or an attribute typed by another context's value
 * object (decision 16): the ways one context takes something from another and
 * has terms to state about it. What is borrowed in the last case is the
 * definition and not an instance, which is why it counts.
 *
 * A pair that has declared separate ways is not asked. The question here is
 * whether the two have said how they stand, and they have: they have said they
 * do not integrate. What is wrong with a crossing across that declaration is
 * that it contradicts it, which `separate-ways` reports as an error at the
 * same element (see {@link relationshipJoins}).
 *
 * An identity crossing is not one of them any more. An id an entity holds is a
 * real dependency and the context map draws it, under «id», which is its
 * record; but asking for a typed relationship on top of it produced fourteen
 * upstream-downstream relationships across the reference models with no roles
 * at all, each with a comment saying nothing is exchanged — a shape DDD does
 * not have, invented to quieten a warning. A relationship is declared where
 * something is exchanged or a language is borrowed (decision 14, amendment of
 * 2026-09-09; card 100). Where the two contexts have declared separate ways,
 * the identity is still refused, by `separate-ways`, which is the rule that
 * has something to say about it.
 *
 * A subscription counts for the same reason `separate-ways` and
 * `partnership-backed` count one; the coupling is real whether it is written as
 * a consumption or reached through a policy. The map does not draw a
 * subscription — it reads consumptions and identities — but it does not have
 * to, because `subscription-consumed` makes the consumption exist, and it is
 * that consumption the map draws. What is missing here is the answer to the
 * question the edge raises, which is on what terms.
 *
 * One diagnostic per undeclared pair, not per crossing and not per direction:
 * one relationship in either direction is what would clear them all, so one
 * warning is what a reader can act on. Two contexts that each depend on the
 * other may still want two relationships, and `relationship-duplicate` keeps
 * those apart; this rule asks only that the pair has been described at all.
 */
const relationshipDeclared: Rule = (workspace) => {
	const missing = new Map<string, Diagnostic>();
	const note = (
		upstream: BoundedContext,
		downstream: BoundedContext,
		message: string,
		ref: string,
	) => {
		// Keyed by the pair rather than by the direction, because one
		// relationship either way round is what clears it.
		const key = [upstream.ref, downstream.ref].sort().join("|");
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
				// A deadline crosses nothing: it is the process's own timer, so
				// there is no second context for a relationship to describe.
				if (trigger instanceof Deadline) continue;
				const upstream =
					trigger instanceof Answer
						? trigger.operation.boundedcontext
						: trigger.provider.boundedcontext;
				if (upstream === bc) continue;
				const what =
					trigger instanceof Answer
						? `waits for "${trigger.origin}" to come back from`
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
 * What two relationships collide on: the pair, how they are joined, and what
 * the agreement is called. A symmetric type has no direction, so participants
 * either way round are the same relationship declared twice.
 *
 * Every directed type shares one key. `customer-supplier` is not a second kind
 * of joint but a flavour of upstream/downstream — decision 03's own words for
 * it — so a pair that declares both in one direction under one name has said
 * one thing twice and disagreed with itself about whether the downstream has a
 * say in the upstream's planning. The direction is still part of the key: two
 * contexts that each depend on the other are two relationships, one each way,
 * and the map draws them as two arrows (card 98).
 *
 * The name is part of it too, because one pair may hold two agreements in one
 * direction — a negotiated fulfilment API and a tolerated legacy feed from the
 * same warehouse — and each carries its own roles, comments and disposition.
 * Named, they have different refs and different keys and both stand; unnamed,
 * or named the same twice, they are one declaration made twice (decision 15,
 * card 103).
 */
function relationshipKey(relationship: ContextRelationship): string {
	const { source, target, type, nameId } = relationship;
	const called = nameId ? `~${nameId}` : "";
	if (isDirectedRelationshipType(type))
		return `${source.id}~directed~${target.id}${called}`;
	const ends = [source.id, target.id].sort();
	return `${ends[0]}~${type}~${ends[1]}${called}`;
}

/**
 * One unnamed relationship per direction between a pair of contexts, and one
 * per symmetric type.
 *
 * A relationship is the one model element with no id of its own: its ref is
 * the two contexts, the type, and the name where it has one. Declare the same
 * one twice and the two share a ref, so the second is unreachable — nothing
 * can link to it, and a comment or a disposition on it is written where no
 * reader will ever land.
 *
 * Two directed relationships of different types in one direction, both
 * unnamed, keep their separate refs and are worse for it: both are reachable,
 * both are drawn, and they contradict each other on the one question the type
 * answers. The roles are split across two rows, so neither says what the pair
 * has agreed, and a rule reading the roles — `schema-context`,
 * `relationship-roles-backed`, `relationship-cycle` — gets a different answer
 * depending on which row it lands on.
 *
 * Naming them is what makes the second row a second agreement rather than a
 * contradiction: a negotiated fulfilment API and a tolerated legacy feed from
 * the same warehouse are two things the pair has agreed, each with its own
 * roles, comments and disposition, and each reachable at its own ref. So a
 * distinct name clears this rule, and the rules reading the roles read each
 * agreement's own (decision 15, card 103).
 *
 * An error otherwise, because the model has lost information the moment it is
 * written.
 */
const relationshipDuplicate: Rule = (workspace) => {
	const seen = new Map<string, ContextRelationship>();
	const diagnostics: Diagnostic[] = [];
	for (const relationship of workspace.relationships) {
		const key = relationshipKey(relationship);
		const first = seen.get(key);
		if (!first) {
			seen.set(key, relationship);
			continue;
		}
		const { source, target, type, name } = relationship;
		const called = name ? ` called "${name}"` : "";
		const apart = name
			? "; give the second a name of its own, or say the two things on one of them"
			: "; name them both — a negotiated API and a tolerated feed are two agreements — or say the two things on one";
		const message =
			first.type === type
				? `"${source.name}" and "${target.name}" declare a ${type} relationship${called} more than once; the two share a ref, so only the first can be reached and everything said on this one is lost${apart}`
				: `"${source.name}" and "${target.name}" declare both a ${first.type} and a ${type} relationship${called} with "${source.name}" upstream; customer-supplier is a flavour of upstream/downstream, so one direction between one pair carries one directed relationship under one name, and two of them disagree about how the pair stands${apart}`;
		diagnostics.push({
			severity: "error",
			rule: "relationship-duplicate",
			message,
			ref: relationship.ref,
		});
	}
	return diagnostics;
};

/**
 * The agreements one context has with another in one direction: the directed
 * relationships running from `from` to `to`.
 *
 * One pair holds at most one unnamed agreement per direction
 * (`relationship-duplicate`), and since card 103 it may hold two named ones —
 * a negotiated fulfilment API beside a tolerated legacy feed. Where it holds
 * two, which of them an exchange belongs to is the exchange's to say.
 */
function agreementsFrom(
	workspace: Workspace,
	from: BoundedContext,
	to: BoundedContext,
): ContextRelationship[] {
	return workspace.relationships.filter(
		(r) =>
			isDirectedRelationshipType(r.type) &&
			r.source === from &&
			r.target === to,
	);
}

/**
 * Every directed agreement joining two contexts, whichever way round it runs.
 *
 * An exchange may belong to an agreement pointing either way, because the
 * arrow is a claim about who dictates the model and not about who calls whom:
 * a card processor that sends its own format is upstream of the bank whose
 * operation it calls, and the crossing runs from the bank to the processor
 * (decision 03, amendment of 2026-09-09). So membership of the pair is what a
 * named agreement is held to, and the direction is what tells two agreements
 * apart when the pair has two of them.
 */
function agreementsBetween(
	workspace: Workspace,
	one: BoundedContext,
	other: BoundedContext,
): ContextRelationship[] {
	return workspace.relationships.filter(
		(r) =>
			isDirectedRelationshipType(r.type) &&
			r.involves(one) &&
			r.involves(other),
	);
}

/**
 * The agreement a crossing belongs to: the one it names, or the pair's only
 * one in the crossing's direction.
 *
 * Undefined where the model has not said which — an unnamed crossing between
 * a pair holding two agreements — or where what it named is not an agreement
 * running from the provider's context to the consumer's. Both are what
 * `consumption-agreement` reports, and a crossing it reports belongs to no
 * agreement here, so no rule counts it for one or criticises an agreement for
 * it (decision 15, amended 2026-09-10).
 */
function agreementOf(
	workspace: Workspace,
	consumption: Consumption,
): ContextRelationship | undefined {
	const agreements = agreementsFrom(
		workspace,
		consumption.consumable.provider.boundedcontext,
		consumption.consumer.boundedcontext,
	);
	const named = consumption.relationship;
	if (named) return agreements.includes(named) ? named : undefined;
	return agreements.length === 1 ? agreements[0] : undefined;
}

/**
 * Which of two contexts the model says is upstream, where a directed
 * relationship says anything at all. Undefined means the pair has declared
 * none, and the implied edge the context map draws reads the provider as the
 * upstream, which is what the rules below fall back on.
 *
 * Where the question is asked about one exchange and that exchange names its
 * agreement, that agreement answers it. Read off the pair alone it was
 * whichever directed relationship came first in the workspace, which two
 * agreements between one pair made arbitrary (card 107).
 */
function declaredUpstream(
	workspace: Workspace,
	one: BoundedContext,
	other: BoundedContext,
	crossing?: Consumption,
): BoundedContext | undefined {
	const named = crossing?.relationship;
	if (named?.involves(one) && named.involves(other)) return named.source;
	return workspace.relationships.find(
		(r) =>
			isDirectedRelationshipType(r.type) &&
			r.involves(one) &&
			r.involves(other),
	)?.source;
}

/**
 * A crossing between a pair that holds two agreements in its direction says
 * which of them it belongs to, and what it says is one of them.
 *
 * Card 103 let one pair hold two agreements in one direction — a negotiated
 * fulfilment API beside a tolerated legacy feed from the same warehouse — and
 * left their traffic pooled. Every crossing between the pair then counted for
 * both, so `relationship-roles-backed` read each agreement against the other's
 * exchanges and criticised each for a role the other carries, and the declared
 * direction was whichever agreement came first. Naming the agreement is the
 * one fact that tells the two apart, and where the pair holds one there is
 * nothing to tell apart, so nothing is asked (decision 15's amendment).
 *
 * What it names is held to joining its two contexts and nothing more. An
 * agreement pointing the other way is a legitimate answer: upstream is
 * whoever dictates the model, so a card processor that sends its own format
 * is upstream of the bank whose operation it calls, and the one agreement
 * that exchange runs under points against the traffic (decision 03). The
 * direction is still what the question is asked about — two agreements from
 * the provider's context to the consumer's are what nothing tells apart — but
 * it is not what an answer is measured against.
 *
 * A warning, and it is the whole diagnostic for such a crossing: an exchange
 * this rule reports belongs to no agreement, so `relationship-roles-backed`
 * neither counts it for one nor criticises it against one, and the author is
 * told once what to write rather than twice what it broke.
 */
const consumptionAgreement: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const consumption of consumptionsOf(workspace)) {
		const provider = consumption.consumable.provider.boundedcontext;
		const consumer = consumption.consumer.boundedcontext;
		if (provider === consumer) continue;
		const named = consumption.relationship;
		if (named) {
			if (agreementsBetween(workspace, provider, consumer).includes(named))
				continue;
			diagnostics.push({
				severity: "warning",
				rule: "consumption-agreement",
				message: `"${consumption.consumer.name}" says its consumption of "${consumption.consumable.name}" belongs to ${relationshipLabel(named)}, which does not join "${provider.name}" and "${consumer.name}"; an exchange belongs to an agreement between the two contexts it crosses`,
				ref: consumption.ref,
			});
			continue;
		}
		const agreements = agreementsFrom(workspace, provider, consumer);
		if (agreements.length < 2) continue;
		diagnostics.push({
			severity: "warning",
			rule: "consumption-agreement",
			message: `"${consumption.consumer.name}" consumes "${consumption.consumable.name}" from "${provider.name}" without saying which agreement it belongs to; the pair has ${agreements.length} in that direction — ${agreements.map((it) => `"${it.name ?? it.type}"`).join(", ")} — and their roles, comments and dispositions are different things`,
			ref: consumption.ref,
		});
	}
	return diagnostics;
};

/** How a relationship reads in a message: its name where it has one, else its type. */
function relationshipLabel(relationship: ContextRelationship): string {
	return relationship.name
		? `the agreement "${relationship.name}" between "${relationship.source.name}" and "${relationship.target.name}"`
		: `the ${relationship.type} relationship between "${relationship.source.name}" and "${relationship.target.name}"`;
}

/**
 * Consumables and consumptions declare roles that fit their declared position.
 *
 * The roles belong to the two ends of a relationship, not to the two ends of a
 * call. Upstream is who dictates the model (decision 03, 2026-09-09), so the
 * provider of a consumable is the upstream in the common case and not always:
 * where the caller sends its own format and the provider translates it, the
 * provider is downstream of the context calling it. Asking that provider for
 * an upstream role, and its caller for a downstream one, asks each side to
 * claim the opposite of what the relationship says — which is how NorthBank
 * came to call a card processor a conformist of the bank it dictates the
 * message to.
 *
 * So the rule reads the declared direction first. Where the provider is the
 * declared upstream, or the pair has declared nothing and the implied edge
 * reads the provider as upstream, the consumable carries the upstream role and
 * the consumption the downstream one, as before. Where the consumer is the
 * declared upstream, neither field is the right place for either role — a
 * consumable carries only an upstream role and a consumption only a downstream
 * one — so the roles live on the relationship, and `relationship-roles-backed`
 * is what reads them there.
 */
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
		// The call runs against the declared direction: the caller is upstream
		// and the provider translates for it. Nothing to ask of either end here.
		if (
			declaredUpstream(workspace, provider, consumer, consumption) === consumer
		)
			continue;
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
 * The crossings that count for one agreement: those between its two contexts
 * that belong to it (see {@link agreementOf}). Where the pair holds one
 * agreement in that direction, that is every crossing between them, as it was
 * before card 107; where it holds two, each reads its own traffic and neither
 * is criticised for the other's.
 */
function crossingsFor(
	workspace: Workspace,
	relationship: ContextRelationship,
): Consumption[] {
	return crossingsBetween(
		workspace,
		relationship.source,
		relationship.target,
	).filter((c) => agreementOf(workspace, c) === relationship);
}

/**
 * Whether a crossing consumable carries an upstream role. A published language
 * is a data shape, not a second flag, so any crossing consumable with a shape
 * on it publishes one: an open-host-service operation with a schema backs both
 * roles at once.
 *
 * Any shape, in either direction. The rule used to read `schema` alone, so a
 * query whose whole language is what it answers with — a read model returning
 * `Counts`, taking an id as its parameter and nothing more — published a
 * language the rule could not see (card 98).
 */
function carriesUpstreamRole(
	consumable: Consumable,
	role: UpstreamRole,
): boolean {
	if (consumable.pattern === role) return true;
	return role === "published-language" && carriesAnySchema(consumable);
}

/** Whether a consumable names a payload shape at all: sent, answered or refused. */
function carriesAnySchema(consumable: Consumable): boolean {
	return (
		consumable.schema !== undefined ||
		consumable.returns !== undefined ||
		consumable.rejects.length > 0
	);
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
 *
 * Published language is the mirror of it, and reads the same borrowing from
 * the upstream's side. A standards body publishes a language and provides
 * nothing to consume: FHIR, ISO 20022 and a scheme's record layout are schemas
 * a conformist takes and sends over a pipe the model does not draw, so the
 * shapes the downstream borrows are the whole of what the upstream offers.
 * Backing the role only by a schema-carrying consumption meant the one role
 * that describes a standards body was warned unbacked whenever it was declared
 * (decision 28's amendment, card 95).
 *
 * An anti-corruption layer reads the borrowing for the same reason a
 * conformist does, and it is the case decision 03's 2026-09-09 amendment is
 * about. Where the upstream is the caller — a card processor sending its own
 * format, an EDI partner, an HL7 orderer — nothing crosses from upstream to
 * downstream at all: the traffic runs the other way and the only trace of who
 * dictates the language is the foreign shape on the operation the caller
 * reaches. That shape is exactly what `schema-context` takes the layer as the
 * warrant for, so it is what backs it here; asking for a consumption instead
 * would warn on every inbound integration there is (card 98).
 *
 * The traffic is read per agreement, not per pair. Where one pair holds two
 * agreements in one direction (card 103), pooling their crossings meant each
 * agreement was judged by the other's exchanges: the negotiated API was told
 * nothing carries its open-host role because the crossing that does belongs to
 * the legacy feed, and both were told about the other's conformist. A crossing
 * counts for the agreement it names, or for the pair's only one where it names
 * none; a crossing that belongs to neither is `consumption-agreement`'s to
 * report and is left out of this rule entirely (card 107).
 */
const relationshipRolesBacked: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const relationship of workspace.relationships) {
		if (!isDirectedRelationshipType(relationship.type)) continue;
		const upstream = relationship.source;
		const downstream = relationship.target;
		const crossings = crossingsFor(workspace, relationship);
		for (const role of relationship.upstreamRoles) {
			if (crossings.some((c) => carriesUpstreamRole(c.consumable, role)))
				continue;
			if (role === "published-language" && borrowsFrom(downstream, upstream))
				continue;
			const alsoBorrowed =
				role === "published-language"
					? `, and nothing in "${downstream.name}" carries one of its schemas or value objects`
					: "";
			diagnostics.push({
				severity: "warning",
				rule: "relationship-roles-backed",
				message: `"${upstream.name}" is declared ${role} to "${downstream.name}", but nothing "${downstream.name}" consumes from "${upstream.name}" carries that upstream role${alsoBorrowed}`,
				ref: relationship.ref,
			});
		}
		for (const role of relationship.downstreamRoles) {
			if (crossings.some((c) => c.pattern === role)) continue;
			if (role === "conformist" && borrowsFrom(downstream, upstream)) continue;
			if (
				role === "anti-corruption-layer" &&
				translatesForUpstream(downstream, upstream)
			)
				continue;
			const alsoBorrows =
				role === "conformist"
					? `, and nothing in it carries one of "${upstream.name}"'s schemas or value objects`
					: `, and nothing it offers "${upstream.name}" is in "${upstream.name}"'s own shapes`;
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

/**
 * Whether `downstream` offers `upstream` something in `upstream`'s own shapes:
 * the inbound half of an integration, where the caller dictates the format and
 * the layer translates it (see {@link translatesForCaller}).
 */
function translatesForUpstream(
	downstream: BoundedContext,
	upstream: BoundedContext,
): boolean {
	for (const p of [
		...downstream.aggregates.values(),
		...downstream.services.values(),
	])
		for (const c of p.consumables.values())
			if (translatesForCaller(c, upstream)) return true;
	return false;
}

/** Whether one context calls an operation the other offers, on any terms. */
function callCrosses(
	workspace: Workspace,
	provider: BoundedContext,
	consumer: BoundedContext,
): boolean {
	return crossingsBetween(workspace, provider, consumer).some(
		(c) => c.consumable.type === "operation",
	);
}

/**
 * Whether the downstream context calls an operation the upstream one offers
 * and takes its contract as it stands.
 *
 * An anti-corruption layer is a translation the downstream owns: the
 * upstream's contract stops at it, and the model behind it is free to change
 * on its own schedule, which is the whole reason the pattern exists. A call
 * made through one does not bind the two models together and is not a step
 * toward a ring (decision 20's 2026-09-08 amendment).
 *
 * Which calls are translated is the consumption's to say, not the
 * relationship's. Read off the relationship's roles, as it was until card 100,
 * one translated call laundered every untranslated one beside it: a pair with
 * six calls and a layer on one of them was excused the other five, and the
 * roles the rule read are a summary of the pair rather than a statement about
 * any particular exchange (decision 20, note of 2026-09-09). A step counts
 * when at least one call across it is untranslated, which is exactly when
 * somebody here is written against the neighbour's contract.
 */
function untranslatedCallCrosses(
	workspace: Workspace,
	upstream: BoundedContext,
	downstream: BoundedContext,
): boolean {
	return crossingsBetween(workspace, upstream, downstream).some(
		(c) =>
			c.consumable.type === "operation" &&
			c.pattern !== "anti-corruption-layer",
	);
}

/**
 * The contexts each one moves as one with for this walk: itself, its partners,
 * and its partners' partners.
 *
 * A partnership says two teams succeed or fail together and plan their
 * releases as one, which is the answer to a ring of calls rather than another
 * step in it: the mutual dependency is deliberate and coordinated, and the two
 * have stopped being two things that can be released against each other's
 * contracts. So they are one node here, and a call between them is no step at
 * all. Partnerships chain, because moving as one is transitive: three contexts
 * pairwise partnered are one release train, not three.
 *
 * Every group is a plain array shared by its members, so merging two is
 * writing the joined array back over both.
 */
function movingAsOne(
	workspace: Workspace,
): Map<BoundedContext, BoundedContext[]> {
	const groups = new Map<BoundedContext, BoundedContext[]>();
	for (const bc of workspace.boundedcontexts.values()) groups.set(bc, [bc]);
	for (const relationship of workspace.relationships) {
		if (relationship.type !== "partnership") continue;
		const one = groups.get(relationship.source);
		const other = groups.get(relationship.target);
		if (!one || !other || one === other) continue;
		const joined = [...one, ...other];
		for (const bc of joined) groups.set(bc, joined);
	}
	return groups;
}

/**
 * The directed relationships whose traffic is calls form no cycle.
 *
 * Upstream and downstream is a statement about models: the downstream context
 * shapes its own model around what the upstream offers, and a ring of those
 * means the contexts on it depend on each other's contracts. Three things do
 * not count as a step (decision 20). A step carried only by events, or by a
 * policy subscribing to the other side's event, is choreography, and rings of
 * those are `reaction-cycle`'s business. A call the downstream translates
 * behind an anti-corruption layer is not a step either: the ACL is exactly
 * what lets the two models evolve independently, so a pair that calls each
 * other through one is not stuck. That is read on the consumption that
 * declares it and never on the relationship's roles (see
 * {@link untranslatedCallCrosses}). And a call between partners is not a step,
 * because partners are one node here (see {@link movingAsOne}) — which is what
 * the fix text has always promised and the walk did not do, so the remedy it
 * named cleared nothing (card 104). What is left is the honest case: contexts
 * calling each other with nothing between them.
 */
const relationshipCycle: Rule = (workspace) => {
	// The nodes are the contexts, partners counted as one, so every ring found
	// is a ring of distinct nodes. Walking the relationships instead would also
	// report the longer closed walks that thread the same context twice, which
	// say nothing new.
	const groups = movingAsOne(workspace);
	const asOne = (bc: BoundedContext) => (groups.get(bc) ?? [bc])[0];
	const startingAt = new Map<BoundedContext, ContextRelationship[]>();
	for (const relationship of workspace.relationships) {
		if (!isDirectedRelationshipType(relationship.type)) continue;
		if (asOne(relationship.source) === asOne(relationship.target)) continue;
		if (
			!untranslatedCallCrosses(
				workspace,
				relationship.source,
				relationship.target,
			)
		)
			continue;
		append(startingAt, asOne(relationship.source), relationship);
	}

	/** A node's name: the context's, or every partner's where it is a group. */
	const named = (bc: BoundedContext) =>
		(groups.get(bc) ?? [bc]).map((it) => `"${it.name}"`).join(" and ");

	return cyclesOf(
		new Set([...workspace.boundedcontexts.values()].map(asOne)),
		(context) => (startingAt.get(context) ?? []).map((r) => asOne(r.target)),
		(context) => context.id,
	).flatMap((ring) => {
		// The ring reports at a relationship on it rather than at a context, so a
		// reader lands on something they can edit. There is one by construction —
		// the ring was walked along it — and the guard just keeps that honest.
		const next = ring.length === 1 ? ring[0] : ring[1];
		const link = (startingAt.get(ring[0]) ?? []).find(
			(r) => asOne(r.target) === next,
		);
		if (!link) return [];
		// Where a node is a partnership, the ring survived it and the reader is
		// owed the reason: the pair is one context here, so the ring runs
		// through the pair rather than between them.
		const partners = ring.filter((it) => (groups.get(it) ?? []).length > 1);
		const asOneNote = partners.length
			? `. ${partners
					.map((it) => named(it))
					.join("; ")} are partners, so each of those moves as one context here`
			: "";
		return [
			{
				severity: "warning" as const,
				rule: "relationship-cycle",
				message: `Calls run in a cycle: ${[...ring, ring[0]]
					.map(named)
					.join(
						" -> ",
					)}; each of these calls the next, so all of them depend on each other's contracts${asOneNote}. Put an anti-corruption layer on one of the steps, so that side translates and is free to change; or declare a partnership between two neighbours on the ring that really do move as one, which makes them one context here; or reverse a dependency by turning that call into an event the other side reacts to`,
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
 * nests one of its schemas, or carries one on a consumable — sent, answered or
 * refused: the ways a kernel is shared, and the evidence that one context has
 * taken another's language.
 *
 * All three payload fields count, because all three are the owner's shape in
 * the borrower's hands. Reading `schema` and `returns` and not `rejects` left
 * a context whose only borrowing is the refusal it passes on unaccounted for
 * (card 98).
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
			if (c.rejects.some((it) => it.boundedcontext === owner)) return true;
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
 * Whether `downstream` takes anything of `upstream`'s as it stands.
 *
 * Two things count, and they are the two ways the model can record it. The
 * downstream names one of the upstream's schemas or value objects on something
 * of its own, which is `borrowsFrom` and is the borrowing the conformist role
 * warrants. Or it consumes something the upstream provides — any consumable,
 * whether it carries a schema or not.
 *
 * That second half used to ask for a payload: a consumed operation counted,
 * and a consumed event counted only if it carried one of the upstream's
 * schemas. So a context conforming to a neighbour's bare notification — an
 * event whose name is the whole of it, `NightlyBatchCompleted` — was told
 * there was nothing to conform to, while the rule's own summary said it
 * consumed nothing the upstream published. It did. What is conformed to is the
 * upstream's language, and a name is language; the models never showed it
 * because a shared assertion demanded a schema on every cross-context event
 * and hid the case (card 95).
 */
function conformsInSubstance(
	workspace: Workspace,
	downstream: BoundedContext,
	upstream: BoundedContext,
): boolean {
	if (borrowsFrom(downstream, upstream)) return true;
	return crossingsBetween(workspace, upstream, downstream).length > 0;
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
 * event-driven conformist there is — and demanding one on the event, which the
 * rule did until card 95, reported the ones whose upstream publishes a bare
 * notification.
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
			message: `"${downstream.name}" declares itself a conformist of "${upstream.name}", but it names none of "${upstream.name}"'s schemas or value objects and consumes nothing "${upstream.name}" provides, so there is nothing here to conform to`,
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
 *
 * The rule used to treat an identity attribute naming a mud context as
 * traffic of its own, and cleared the warning on any anti-corruption
 * consumption from that mud anywhere in the model. That let a context that
 * received a legacy key at second hand — through a third context, holding no
 * consumption of the mud at all — silence the warning only by inventing one
 * it had no reason to make. A held key is not a crossing; the rule reads
 * consumptions, which is where the mess actually enters a context, and says
 * nothing about an identity attribute that merely names the mud (decision 28,
 * amended; card 108).
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

/**
 * Contexts that have declared separate ways depend on each other in no way at
 * all.
 *
 * Separate ways is the declaration that two contexts are not integrated: no
 * traffic, no shared language, no dependency on each other's model. So it
 * covers every crossing the model can record, not only the consumption. A
 * subscription is one, for the reason `relationship-declared` counts one. An
 * identity an entity holds that names the other context's entity is one: this
 * context is storing something knowing what it points at over there, which is
 * a dependency on that context's identity scheme (decision 14). An attribute
 * typed by the other context's value object is one: the language has been
 * borrowed.
 *
 * The last two used to be reported by `relationship-declared`, which said
 * something false about them — that no relationship described the pair, when
 * one did and it said these contexts do not integrate. Card 100 moved them
 * here, where the rule can say what is actually wrong.
 */
const separateWays: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	const separateWaysRelationships = workspace.relationships.filter(
		(r) => r.type === "separate-ways",
	);
	/** Whether the two contexts have declared they do not integrate. */
	const apart = (one: BoundedContext, other: BoundedContext) =>
		one !== other &&
		separateWaysRelationships.some((r) => r.involves(one) && r.involves(other));
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
	// An identity held here that names something over there is a dependency on
	// the other context's identity scheme, which separate ways says there is
	// none of.
	for (const crossing of identityCrossings([
		...workspace.boundedcontexts.values(),
	])) {
		if (!apart(crossing.from, crossing.to)) continue;
		diagnostics.push({
			severity: "error",
			rule: "separate-ways",
			message: `"${crossing.from.name}" holds "${crossing.attribute.name}", ${identityNamed(crossing)}, although the contexts declare separate ways`,
			ref: crossing.attribute.ref,
		});
	}
	// A value object borrowed from over there is the other context's language
	// in this one, which separate ways says is not shared.
	for (const { attribute, valueobject, from } of valueObjectBorrowings(
		workspace,
	)) {
		const owner = valueobject.boundedcontext;
		if (!apart(from, owner)) continue;
		diagnostics.push({
			severity: "error",
			rule: "separate-ways",
			message: `"${from.name}" types "${attribute.owner.name}"'s "${attribute.name}" by "${valueobject.name}" from "${owner.name}" although the contexts declare separate ways`,
			ref: attribute.ref,
		});
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
 *
 * Callers are compared by ref, which is what the consumption's own path is
 * built from. Comparing them by anything narrower let the two disagree: the
 * path used the caller's bare id, so a policy and an operation with one id
 * gave two consumptions one ref while this rule, reading the callers
 * themselves, saw two different things and said nothing (card 95).
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
		const callers = new Map<string, Consumption>();
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
				if (callers.has(caller.ref))
					report(`"${caller.name}" makes more than one`);
				else callers.set(caller.ref, consumption);
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
 * What takes a fact in is a reaction.
 *
 * `consumption-by-operation` says the other half: a call is made by an
 * operation, because a reactor issues one and that operation crosses the
 * boundary. A subscription is the mirror image. Nothing is issued and nothing
 * waits; the fact arrives and a policy or a process of the consumer's context
 * wakes, which is what a subscription *is* (decisions 17 and 21). Naming an
 * operation instead says that the operation is somehow listening, and an
 * operation does not listen: it is issued. Ten consumptions across the
 * reference models were written that way, and each one left the reaction walk
 * dark at exactly the point a reader wants it — the event arrived, and the
 * model named a thing that does nothing when it does (card 98).
 *
 * The truthful shape is a policy that reacts and issues a local operation, and
 * the operation that was named here reads what that one wrote. Where nobody
 * reacts at all, the honest edit is to delete the consumption: a fact this
 * context does nothing with is not a dependency, however plausible the
 * dependency sounds.
 *
 * An error, because the model is telling the reader about a reaction by naming
 * something that never runs when the fact arrives.
 */
const consumptionByReactor: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const consumption of consumptionsOf(workspace)) {
		const { consumer, consumable } = consumption;
		if (consumable.type !== "event") continue;
		for (const caller of consumption.by) {
			if (!(caller instanceof Consumable)) continue;
			diagnostics.push({
				severity: "error",
				rule: "consumption-by-reactor",
				message: `"${consumer.name}" says its subscription to "${consumable.name}" is made by the operation "${caller.name}"; an operation is issued rather than woken, so name the policy or the process of "${consumer.boundedcontext.name}" that reacts to the fact — for a projection or a report, that is the policy whose own operation writes what "${caller.name}" later reads`,
				ref: consumption.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * A consumption of an operation says which of the consumer's own operations
 * makes the call, unless the consumer has only one and there is nothing to
 * choose between.
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
 * Inside a context the silence costs the same, and until card 107 nothing said
 * so: a front on an application service with two operations that consumes an
 * aggregate's operation without `by` reaches no events, the flow map stops at
 * it, and `raises-restated` still tells the front not to restate what it
 * reaches. The boundary was never what made the caller ambiguous — the number
 * of operations is — so the rule asks the same question of a crossing and of a
 * call next door (decision 21, note of 2026-09-10).
 *
 * What is not asked is which operation of somebody else's machine calls out.
 * An external context is a system the enterprise does not own and a big ball of
 * mud is one nobody can read; naming a caller inside either is the invention
 * decision 28 refuses, and asking for it is how NorthBank came to have one
 * (decision 28, second amendment of 2026-09-10).
 *
 * A warning rather than an error: the exchange is real and drawn either way,
 * and an author part-way through an interview should not be blocked for not yet
 * knowing which operation calls out (decision 21, third amendment).
 */
const consumptionByRequired: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const consumption of consumptionsOf(workspace)) {
		const { consumer, consumable } = consumption;
		const provider = consumable.provider.boundedcontext;
		const here = consumer.boundedcontext;
		if (consumable.type !== "operation") continue;
		if (here.external || here.bigBallOfMud) continue;
		if (consumption.by.length > 0) continue;
		const operations = [...consumer.consumables.values()].filter(
			(it) => it.type === "operation",
		);
		if (operations.length < 2) continue;
		const from = provider === here ? consumable.provider.name : provider.name;
		diagnostics.push({
			severity: "warning",
			rule: "consumption-by-required",
			message: `"${consumer.name}" consumes "${consumable.name}" from "${from}" without saying which of its own operations makes the call; it provides ${operations.map((it) => `"${it.name}"`).join(", ")}`,
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
 * The consumption goes on the application service that owns the reaction,
 * which is the node providing the operations the reactor issues, and its `by`
 * names the reactor: a policy is allowed in a `by` precisely because reacting
 * to a published fact is the commonest reason a consumption exists (decision
 * 21). Neither is enforced here — the rule asks for the consumption, not for a
 * particular place to hang it — but both are what the fix says to write. Not
 * an aggregate: this rule only ever fires on another context's event, and an
 * aggregate may not consume one at all (`aggregate-consumes-inside`), so the
 * fix that named one sent an author from this error straight into that one.
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
 * consumer's context that reacts to it.
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
 * Only a reactor clears it. Naming an operation in `by` used to, on the
 * reading that a projection updated by an operation or a report that
 * accumulates had said what the subscription was for. It had not: an operation
 * is issued, not woken, so the model was left saying that a fact arrives and
 * pointing at something that does not run when it does, and the reaction walk
 * stopped there in ten places across the reference models.
 * `consumption-by-reactor` now refuses that `by` outright, and what a
 * projection really has is a policy that reacts and issues the operation which
 * writes it (decision 21; card 98).
 *
 * A warning rather than an error, because the subscription may be real and the
 * reaction simply not modelled yet.
 */
const subscriptionBacked: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of modelledContexts(workspace)) {
		const reacted = new Set<ProcessTrigger>();
		for (const reactor of reactorsOf(bc))
			for (const trigger of subscribedTriggers(reactor)) reacted.add(trigger);
		for (const member of [...bc.aggregates.values(), ...bc.services.values()])
			for (const consumption of member.consumptions) {
				const { consumable } = consumption;
				if (consumable.type !== "event") continue;
				if (reacted.has(consumable)) continue;
				diagnostics.push({
					severity: "warning",
					rule: "subscription-backed",
					message: `"${member.name}" consumes "${consumable.name}" from "${consumable.provider.boundedcontext.name}", but no policy or process of "${bc.name}" reacts to it; a subscription nothing acts on is a dependency with nothing under it`,
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
 *
 * The command a process starts on is read the same way. An instance of this
 * process is this context's own thing to create, so the operation that creates
 * one is this context's own operation; a process claiming that a neighbour's
 * call makes its instances says the neighbour runs a lifecycle it has never
 * heard of. A foreign *event* starting one is a subscription and stays
 * allowed, which is the difference (decision 23, third amendment).
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
		for (const command of startingCommands(process)) {
			const owner = command.boundedcontext;
			if (owner === process.boundedcontext) continue;
			diagnostics.push({
				severity: "error",
				rule: "process-in-context",
				message: `Process "${process.name}" in "${process.boundedcontext.name}" starts on "${command.name}", an operation of "${owner.name}"; the command that creates an instance is this context's own, though an event that starts one may cross`,
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

/**
 * A process says what begins an instance: an event, or the command of its own
 * context that creates one.
 *
 * Both are ordinary. A saga begun by a fact — an application was submitted, a
 * card was authorised — and one begun by a command — open a claim, start the
 * onboarding — are the same construct started two ways, and allowing only the
 * first sent authors back to inventing an event for the call they already had
 * (decision 23, third amendment). What may not start one is an answer or a
 * deadline: a caller has to have made the call to hear it come back, and a
 * deadline is counted from the moment an instance began waiting, so both need
 * the instance to exist already.
 */
const processStarts: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const process of processesOf(workspace)) {
		if (process.startEvents.length > 0) continue;
		diagnostics.push({
			severity: "error",
			rule: "process-starts",
			message: `Process "${process.name}" names no event or command that begins an instance, so nothing in the model says when one exists`,
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
	shares: (consumer: BoundedContext) => boolean = () => false,
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
			if (shares(consumer.boundedcontext)) continue;
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

/**
 * An aggregate's operations are its context's own, not its public boundary —
 * except across a shared kernel, where the sharers' own is what they are.
 *
 * A kernel is a piece of model two or more teams keep in step and run inside
 * their own contexts. Where the thing they share has identity and behaviour —
 * a jointly maintained Product with its unit conversions — it is an aggregate
 * of a kernel context, and each sharer reaches it through its operations;
 * decision 16's note says so, `shared-kernel-backed` counts exactly that call
 * as what backs the relationship, and this rule refused it, so the model
 * recommended a shape it then rejected (decision 16, second amendment of
 * 2026-09-09; card 98). A sharer is not another context reaching in: the
 * kernel is its own code. For every context that does not share it, the
 * aggregate stays internal and the exemption does not apply.
 *
 * The upstream-role half is untouched. An operation offered as an open host is
 * offered to everyone, and what a context offers everyone still leaves an
 * application service.
 */
const aggregateNotPublic: Rule = (workspace) =>
	Array.from(modelledContexts(workspace)).flatMap((bc) =>
		Array.from(bc.aggregates.values()).flatMap((aggregate) =>
			operationsStayInside(
				"aggregate-not-public",
				"Aggregate",
				aggregate,
				(consumer) => sharesKernelWith(workspace, bc, consumer),
			),
		),
	);

/**
 * An aggregate consumes only its own context's consumables, and never another
 * aggregate's operation.
 *
 * An aggregate is a consistency boundary, not a client. Reaching across a
 * context boundary means translation, failure and waiting on someone else's
 * availability, none of which belong inside the transaction that keeps an
 * invariant true; the context's application service makes the foreign call and
 * hands the aggregate what it needs, or a policy reacts to the foreign event
 * and issues an operation of this context (decision 17, amended 2026-09-07).
 *
 * Calling the aggregate next door is the same act with a shorter wire. Each
 * one is saved in its own transaction, so a call from inside one to the other
 * spans two of them exactly as a cross-context call does, and it does it
 * invisibly: the reader sees a relation-free dependency between two clusters
 * that the aggregate map does not draw and no relationship describes. What a
 * context does across its own aggregates is a use case, and a use case is a
 * service's — the front consumes both and orders them, which is the shape
 * decision 17 asks for outward and this rule now asks for inward (card 100).
 * An event is left alone: a fact another aggregate published is not a call,
 * and nothing waits on it.
 */
const aggregateConsumesInside: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of modelledContexts(workspace)) {
		for (const aggregate of bc.aggregates.values()) {
			for (const { consumable } of aggregate.consumptions) {
				const owner = consumable.provider.boundedcontext;
				if (owner !== bc) {
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
					continue;
				}
				const provider = consumable.provider;
				if (
					consumable.type !== "operation" ||
					!(provider instanceof Aggregate) ||
					provider === aggregate
				)
					continue;
				diagnostics.push({
					severity: "error",
					rule: "aggregate-consumes-inside",
					message: `Aggregate "${aggregate.name}" consumes "${consumable.name}" from aggregate "${provider.name}" in "${bc.name}"; each is saved in its own transaction, so one calling the other spans two of them with nothing on any map to say so. Let a service of "${bc.name}" front the call and hand "${aggregate.name}" what it needs`,
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

/**
 * A domain service is internal logic, so its operations stay inside too.
 *
 * Asked of the contexts whose insides the model states, and of no others. A
 * service's type says where a piece of our own model sits — orchestration at
 * the edge, domain logic in the middle — and an external context has no inside
 * for that distinction to be about: what we know of somebody else's machine is
 * the operations it offers us. Read on an external context the rule made a
 * card scheme that wrote `domain` invalid twice over, once here and once at
 * every operation it publishes, and the repair was to pick the word that kept
 * the validator quiet rather than the word that was true (decision 28,
 * amendment of 2026-09-10, fourth; card 116).
 */
const domainServiceInternal: Rule = (workspace) =>
	Array.from(modelledContexts(workspace)).flatMap((bc) =>
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
 * read `attribute.valueobject` at all; the architect's third review found it.
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
 *
 * On a consumable there is a third, and it is the boundary rather than the
 * model: an anti-corruption layer toward the upstream, where the shape is the
 * caller's language and the translation is what the layer is for
 * ({@link mayCarrySchemaFrom}). An attribute gets no such exception, because
 * an attribute is inside the model and past the layer.
 */
const schemaContext: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	/** Whether the schema is another context's and nothing lets this one hold it. */
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
		for (const p of [...bc.aggregates.values(), ...bc.services.values()]) {
			for (const c of p.consumables.values()) {
				const borrowed = (schema: DataSchema) =>
					schema.boundedcontext !== bc &&
					!mayCarrySchemaFrom(workspace, bc, schema.boundedcontext, c);
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
 * An answer names the operation it comes back from, and two things have to be
 * true of it. The reactor has to have made the call, which is
 * {@link hearsAnswerOf}'s question: it issues the operation itself, or an
 * operation it issues is named in `by` on a consumption of that operation, or
 * nothing says who calls and there is one call in this context to hear, made
 * by a consumer with a single operation to infer. Read at the level of the
 * context, as it was until card 100, it let a reactor wait on an answer to
 * somebody else's call: two teams calling one shared scorer each heard the
 * other's verdict, and the reaction walk drew the step. Read without the
 * single-operation half of the third clause, as it was until card 116, this
 * rule and the walk disagreed: a by-less consumer with three operations passed
 * here and the walk drew no step, so a process waited for an answer the flow
 * map never delivered (decision 21, 2026-09-09 amendment). And the
 * operation has to answer that way — a refusal it never declared is a reply
 * that never arrives, however many other operations refuse with the same shape
 * (decision 23, third amendment), and so is an outcome the refusal does not
 * enumerate, which is the same mistake one segment further down (decision 25,
 * amended). What the model does not check is which branch the reactor takes on
 * it; that is the code's, as every other condition in a process is
 * (decisions 15 and 23).
 *
 * An operation that returns nothing answers with its bare completion, and a
 * reactor may wait on that: a workflow that ends when the activation call
 * succeeds names the completion rather than inventing a response shape
 * (decision 13, second amendment). It is declared by an operation with no
 * `returns` and by nothing else, so waiting on the completion of an operation
 * that does answer with a shape is caught here and told to name that shape.
 *
 * A process may also *start* on an operation of its own context, the command
 * that creates an instance. That is not a reaction to a consumable of the
 * wrong kind, so it is left alone here and asked about by
 * `process-in-context`, which is where the model says whose operation it has
 * to be (see {@link startingCommands}).
 */
/**
 * Why an answer a reactor named is not one the operation gives, which is not
 * the same sentence in the three cases. An operation that answers with a shape
 * has no bare completion — naming one is a second name for the same call
 * coming back, and the shape is the one to wait for — and an event is never
 * called at all, so it has neither.
 */
function undeclaredAnswer(reactor: Policy | Process, answer: Answer): string {
	const who = `${reactorLabel(reactor)} "${reactor.name}"`;
	const { operation } = answer;
	if (!answer.completion)
		return `${who} waits for "${answer.origin}", which "${operation.name}" never declares; wait for an answer the operation says it comes back with, or react to an event instead`;
	if (operation.type !== "operation")
		return `${who} waits for "${operation.name}" to complete, but "${operation.name}" is an event, not an operation; an event is a fact that already happened and nobody is waiting on it to finish`;
	return `${who} waits for "${operation.name}" to complete, but "${operation.name}" returns "${operation.returns?.name}"; wait for that answer, which is the same call coming back and says what it came back with`;
}

const consumableKinds: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		// An external context's policies and processes are refused outright by
		// external-is-boundary; there is nothing here to say about them.
		const reactors = bc.external ? [] : reactorsOf(bc);
		for (const reactor of reactors) {
			for (const trigger of subscribedTriggers(reactor)) {
				if (!(trigger instanceof Answer)) continue;
				if (!trigger.declared)
					diagnostics.push({
						severity: "error",
						rule: "consumable-kind",
						message: undeclaredAnswer(reactor, trigger),
						ref: reactor.ref,
					});
				else if (!hearsAnswerOf(reactor, trigger.operation))
					diagnostics.push({
						severity: "error",
						rule: "consumable-kind",
						message: `${reactorLabel(reactor)} "${reactor.name}" waits for "${trigger.origin}", but nothing says ${reactorLabel(reactor).toLowerCase()} "${reactor.name}" made that call: it does not issue "${trigger.operation.name}", and no consumption of "${trigger.operation.name}" in "${bc.name}" names an operation it issues in "by". An answer comes back to whoever called, so issue that operation, or say in "by" which of this context's operations makes the call, or react to an event instead`,
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
 * arrived — so the second pass round is a later step of the same instance, and
 * what ends it is the `ends` the process declares (decision 23). Two things
 * make that safe to say. The walk came back to the process itself and to no
 * other reactor that is living on this ring: a ring through two live
 * processes, or through a process and a policy, is a genuine loop nobody on it
 * can see the whole of, and is reported, while a process the ring calls and
 * hears back from is not a second reactor at all (see {@link isCalledProcess}).
 * And it came back to an instance that is already running, which is
 * {@link reEntersWhileAlive}.
 *
 * The contexts the ring crosses do not come into it. A process that issues
 * its own operation, whose call reaches the next context through a
 * consumption's `by`, and that waits for the fact that context raises is
 * exactly the shape decision 23 describes; it is one process's lifecycle
 * however far the call travels, and NorthBank's onboarding and RiverMart's
 * checkout are both written that way. Card 102 tried narrowing this to steps
 * of the process's own context and made both of them warn. The two-caller
 * defect card 100 found was closed by routing an answer to the call that
 * asked for it (decision 23, fourth amendment), not here, so this exemption
 * was carrying no weight in it (card 102, the lead's ruling).
 */
function isProcessLifecycle(cycle: Reactor[]): boolean {
	const reactors = liveReactorsOf(cycle);
	const [process] = reactors;
	if (reactors.length !== 1 || !(process instanceof Process)) return false;
	return reEntersWhileAlive(process, beforeOnRing(cycle, process));
}

/**
 * Every reactor on a ring except the processes the ring merely calls: the ones
 * whose own life the ring might be.
 *
 * A ring holding two processes was reported as a genuine loop, and for the
 * commonest shape a second process takes on a ring that is wrong. A triage
 * process issues a booking operation, a scheduling process starts on that
 * operation and its end is the slot the triage process was waiting for: at
 * process granularity that is a call and an answer, one lifecycle asking
 * another to do something and hearing that it is done. Decision 23 already
 * says a process may be started by a command and that its `ends` is how it
 * finishes; reading the second process as a reactor living on the same ring
 * asserted something the model denies — that its instance is kept alive by the
 * ring — and reported a shape every referral, booking and sub-case model has
 * (decision 23, amendment of 2026-09-10, second; card 116).
 *
 * What is left is the live reactors, and the lifecycle tests are asked of
 * those: one live process and nothing else is {@link isProcessLifecycle}, one
 * live process among translating policies is
 * {@link processThroughTranslatingLayer}, and two live processes is the loop
 * the message has always described.
 */
function liveReactorsOf(cycle: Reactor[]): Array<Policy | Process> {
	return cycle.filter(
		(node): node is Policy | Process =>
			node instanceof Policy ||
			(node instanceof Process && !isCalledProcess(node, cycle)),
	);
}

/**
 * Whether the ring calls this process rather than running through its life:
 * it comes in on one of the process's `starts` and leaves on one of its
 * `ends`.
 *
 * Those two facts are what a call is, said at the granularity of a process.
 * Something the ring did began an instance — a command addressed to this
 * context, or a fact it starts on — and the step by which the ring carries on
 * is the very event that completes that instance, so the process did its work
 * and answered. Nothing about the ring keeps this instance alive: it was born
 * on the way in and finished on the way out, and the next turn of the ring
 * makes a different one, exactly as a second call to an operation is a second
 * call. The process whose life the ring might be is the one that is waiting
 * while all of this happens.
 *
 * The exit is looked for along the ring's own steps out of the process, up to
 * the next reactor: a process leaves by an operation it issues, that operation
 * raises the fact, and it is the fact that has to be an `ends`. Read as "the
 * ring holds an `ends` of this process somewhere" it would exempt a process
 * that ends on a fact raised in a different arm of the ring, which is not this
 * shape. An `ends` never wakes the process again — the walk takes no step from
 * an ending trigger — so a ring reaching one has genuinely left.
 */
function isCalledProcess(process: Process, cycle: Reactor[]): boolean {
	const entry = beforeOnRing(cycle, process);
	if (!(entry instanceof Consumable) || !process.startEvents.includes(entry))
		return false;
	const at = cycle.indexOf(process);
	for (let step = 1; step < cycle.length; step++) {
		const node = cycle[(at + step) % cycle.length];
		if (node instanceof Policy || node instanceof Process) return false;
		if (process.endEvents.includes(node)) return true;
	}
	return false;
}

/**
 * Whether the step that closes a ring wakes an instance that is already
 * running, rather than beginning another one.
 *
 * The lifecycle argument is that the ring is one instance moving through its
 * steps and stopping at its `ends`. A step into a `starts` trigger is not
 * that: it makes an instance, so a process whose own operation raises the
 * event it starts on begins a new instance every time round, and nothing in
 * the model says what stops the next one from doing it again. Each pass is a
 * different instance, so no instance's state is holding the ring together and
 * the exemption's whole reason is gone (card 104).
 *
 * Three ways the ring closes into something the instance was waiting for: the
 * process's own deadline, which runs from the process back to itself; an event
 * or an answer named in `on`; and an answer routed through one of the process's
 * calls, which is the same wait seen from the call that carries it (see
 * {@link routesTo}). A trigger that is both a `starts` and an `on` is a wait
 * as well as a start, and is left exempt.
 */
function reEntersWhileAlive(process: Process, before: Reactor): boolean {
	if (before === process) return true;
	return process.events.some(
		(trigger) =>
			trigger === before ||
			(trigger instanceof Answer &&
				routesTo(process, trigger.operation).includes(before)),
	);
}

/** The step of a ring that leads into a node: what happened just before it. */
function beforeOnRing(cycle: Reactor[], node: Reactor): Reactor {
	const at = cycle.indexOf(node);
	return cycle[(at + cycle.length - 1) % cycle.length];
}

/** The step of a ring that follows a node: what it leads to. */
function afterOnRing(cycle: Reactor[], node: Reactor): Reactor {
	return cycle[(cycle.indexOf(node) + 1) % cycle.length];
}

/**
 * Whether a policy is translating on this ring: the trigger it hears here is
 * its anti-corruption-layer subscription, and the operation it issues here
 * raises the very event that carries the ring on.
 *
 * That is the gateway policy NorthBank's honest wiring needed: the scheme
 * answers, the policy hears the answer as the event it publishes through its
 * own translated consumption, and it republishes it as the bank's own fact.
 * It starts nothing the process did not start and holds no state of its own,
 * so it is not a second reactor for {@link isProcessLifecycleThroughLayer}'s
 * purposes — it is the layer the process's lifecycle runs through.
 *
 * Read on the policy alone, as it was until card 113, this asked less than it
 * claimed: a policy with an anti-corruption subscription anywhere and any
 * operation raising any event counted as translating, whatever it was doing on
 * this particular ring. The ring's own steps are what the exemption is about,
 * so they are what is checked — the trigger this ring wakes the policy with,
 * and the operation this ring leaves it by.
 */
function isTranslatingPolicy(policy: Policy, cycle: Reactor[]): boolean {
	const trigger = beforeOnRing(cycle, policy);
	const bc = policy.boundedcontext;
	const members = [...bc.aggregates.values(), ...bc.services.values()];
	const hearsThroughLayer =
		trigger instanceof Consumable &&
		members.some((member) =>
			member.consumptions.some(
				(c) =>
					c.consumable === trigger &&
					c.pattern === "anti-corruption-layer" &&
					c.by.includes(policy),
			),
		);
	if (!hearsThroughLayer) return false;
	const issued = afterOnRing(cycle, policy);
	if (!(issued instanceof Consumable) || !policy.commands.includes(issued))
		return false;
	const carried = afterOnRing(cycle, issued);
	return carried instanceof Consumable && issued.raisedEvents.includes(carried);
}

/**
 * The one process of a ring whose every other reactor is a policy translating
 * on it, or undefined where the ring is not that shape.
 *
 * {@link isProcessLifecycle} exempts a ring on which the process is the only
 * reactor. NorthBank's honest gateway wiring put a second reactor on the
 * ring: the policy that hears the scheme's answer through an
 * anti-corruption-layer consumption and republishes it as the bank's own
 * event, which the process then hears. That policy translates; it starts
 * nothing the process did not start and holds no state between events of its
 * own, so a ring on which one process sits and every other reactor is such a
 * translating policy is the process's lifecycle carried through the layer
 * rather than two cycles, one for each direction of the same call
 * (decision 23, amended 2026-09-10, second; card 108).
 *
 * A process the ring calls and hears back from is not one of the reactors
 * counted here either, for {@link liveReactorsOf}'s reason: it is a call at
 * process granularity, so a ring on which one process waits while a gateway
 * translates and a sub-process is called and finishes is still that one
 * process's lifecycle (card 116).
 *
 * The shape alone is not the exemption, only its first half; whether the
 * process is living or being born again on this ring is
 * {@link isProcessLifecycleThroughLayer}'s question.
 */
function processThroughTranslatingLayer(cycle: Reactor[]): Process | undefined {
	const reactors = liveReactorsOf(cycle);
	const processes = reactors.filter(
		(node): node is Process => node instanceof Process,
	);
	const policies = reactors.filter(
		(node): node is Policy => node instanceof Policy,
	);
	if (processes.length !== 1 || policies.length === 0) return undefined;
	if (!policies.every((policy) => isTranslatingPolicy(policy, cycle)))
		return undefined;
	return processes[0];
}

/**
 * Whether a ring is one process's lifecycle running through a translating
 * layer, rather than a cycle.
 *
 * The shape — one process, every other reactor translating on the ring — is
 * {@link processThroughTranslatingLayer}. The exemption's premise is the other
 * half, and card 108 asserted it without checking it: that the event the
 * process hears here continues an instance. A translated event named in the
 * process's `starts` does not; it makes another instance every time round, so
 * no instance's state holds the ring together and the lifecycle argument is
 * gone. Codex's ninth review drew exactly that ring and it validated clean
 * (decision 23, note of 2026-09-10, second; card 113).
 *
 * What continues an instance is {@link reEntersWhileAlive}: a trigger the
 * process waits on while alive, an answer routed back through one of its
 * calls, or its own deadline. An ending trigger closes no ring at all — the
 * walk takes no step from one, because a fact that completes an instance does
 * not wake it — so `ends` never reaches this question.
 */
function isProcessLifecycleThroughLayer(cycle: Reactor[]): boolean {
	const process = processThroughTranslatingLayer(cycle);
	if (!process) return false;
	return reEntersWhileAlive(process, beforeOnRing(cycle, process));
}

/**
 * The process a ring spawns a new instance of every time round: one whose ring
 * is a translating layer's in every respect except that what comes back to it
 * through the layer is a `starts` trigger.
 *
 * It is a cycle, and the reason it is one is worth saying in the message: a
 * reader who has drawn a lifecycle through a gateway needs to be told that the
 * event coming back begins the process rather than continuing it (card 113).
 */
function spawnsInstancesThroughLayer(cycle: Reactor[]): Process | undefined {
	const process = processThroughTranslatingLayer(cycle);
	if (!process) return undefined;
	return reEntersWhileAlive(process, beforeOnRing(cycle, process))
		? undefined
		: process;
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
 * and not a ring (see {@link isProcessLifecycle}); another is a ring with a
 * process and a translating policy on it, its lifecycle through an
 * anti-corruption layer (see {@link isProcessLifecycleThroughLayer}). Both ask
 * that what comes back to the process continues an instance; where it starts
 * one instead, the ring is reported for what it does — every turn spawns
 * another instance (see {@link spawnsInstancesThroughLayer}; card 113).
 *
 * A ring with no policy or process on it at all is not a chain of reactions —
 * nothing on it wakes on anything, it is a call reaching the next operation
 * and on round to itself — so the claim that "the chain triggers itself" is
 * false of it and the word "reactions" is the wrong word. Where every step of
 * such a ring crosses a context, `relationship-cycle` already walks the same
 * ring as a ring of calls between contexts, and reporting it again here would
 * say the same thing twice in two different words; this rule stays quiet and
 * leaves it there. Where the ring stays inside one context — services calling
 * each other with no reactor between any of them — `relationship-cycle`
 * cannot see it at all, since that rule walks relationships between
 * contexts, so this rule reports it once, honestly, as calls (decision 20,
 * note of 2026-09-10; card 108).
 */
const reactionCycle: Rule = (workspace) => {
	const chain = new ReactionChain(workspace.boundedcontexts.values());
	return cyclesOf(
		chain.steps,
		(node) => chain.after(node),
		(node) => node.ref,
	)
		.filter((cycle) => !isProcessLifecycle(cycle))
		.filter((cycle) => !isProcessLifecycleThroughLayer(cycle))
		.flatMap((cycle) => {
			const contexts = [...new Set(cycle.map((n) => n.boundedcontext))];
			const across =
				contexts.length > 1
					? `; it runs through ${contexts.map((c) => `"${c.name}"`).join(" and ")}, so no one context can see the whole ring`
					: "";
			const hasReactor = cycle.some(
				(node) => node instanceof Policy || node instanceof Process,
			);
			if (!hasReactor && contexts.length > 1) return [];
			const named = [...cycle, cycle[0]].map((n) => `"${n.name}"`).join(" -> ");
			// A ring that would be a lifecycle through a translating layer but
			// for the event coming back into the process's `starts` is named
			// for what it does: each turn begins another instance, so a reader
			// who drew it as one instance's life sees why it is not.
			const spawning = spawnsInstancesThroughLayer(cycle);
			const message = spawning
				? `Reactions run in a cycle that spawns instances: ${named}; the event that closes the ring starts "${spawning.name}" rather than continuing it, so every turn begins another instance and nothing in the model says what ends them${across}`
				: hasReactor
					? `Reactions run in a cycle: ${named}; the chain triggers itself and nothing in the model says what ends it${across}`
					: `Calls run in a cycle: ${named}; each of these calls the next and nothing on the ring reacts to anything, so it is a loop of calls rather than a chain of reactions${across}`;
			return [
				{
					severity: "warning" as const,
					rule: "reaction-cycle",
					message,
					ref: cycle[0].ref,
				},
			];
		});
};

/**
 * Whether a context is a shared kernel: every relationship it has is a shared
 * kernel, and two or more contexts share it.
 *
 * Decision 16's amendment draws a kernel two teams keep in step as a third
 * context both sides borrow from, because that gives the kernel an owner and
 * spares a set of sharers the pairwise agreements. That context is nothing but
 * the kernel — a library of `Money` and `AccountNumber`, not a capability —
 * and its shape says so: it exchanges nothing except by shared kernel, and
 * more than one context shares it. One sharer would be an ordinary pair, where
 * the kernel is the two teams' joint model and neither of them a context of
 * its own.
 */
function isSharedKernelContext(
	workspace: Workspace,
	bc: BoundedContext,
): boolean {
	const sharers = new Set<BoundedContext>();
	let any = false;
	for (const relationship of workspace.relationships) {
		if (!relationship.involves(bc)) continue;
		if (relationship.type !== "shared-kernel") return false;
		any = true;
		sharers.add(
			relationship.source === bc ? relationship.target : relationship.source,
		);
	}
	return any && sharers.size >= 2;
}

/**
 * Every context serves at least one subdomain. An external context does not:
 * a card scheme or a licensor is not part of anybody's problem space here, so
 * it is not missing from the problem-space view -- it was never in it
 * (decision 28).
 *
 * Neither does a shared kernel context, and for the opposite reason: it is not
 * outside the problem space but under all of it. What a kernel of `Money` and
 * `AccountNumber` serves is whatever its sharers serve, and asking it to name
 * a subdomain of its own made NorthBank invent "Shared Financial Primitives",
 * a supporting subdomain with one context in it that no capability map has and
 * nobody's customer journey runs through — a row on the problem-space view
 * that exists so a rule would stop asking (decision 16's amendment, card 95).
 */
const contextServesSubdomain: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of modelledContexts(workspace)) {
		if (bc.subdomains.size > 0) continue;
		if (isSharedKernelContext(workspace, bc)) continue;
		diagnostics.push({
			severity: "warning",
			rule: "context-serves-subdomain",
			message: `Bounded context "${bc.name}" serves no subdomain, so it is missing from the problem-space view`,
			ref: bc.ref,
		});
	}
	return diagnostics;
};

/**
 * What an external context's published contract may state, said once so that
 * every refusal of one says the same thing.
 */
const externalContractMay =
	"A published contract states what one of this system's own operations takes and answers with, in the attributes of its own request and answer schemas, and what its own value objects are; anything else about that system is ours to guess and not to state";

/**
 * Everything a published contract of an external context may constrain: the
 * context's own operations, the attributes of the shapes those operations
 * carry, and the context's own value objects with their attributes.
 *
 * The reach is the contract and nothing beside it. A payment provider
 * documents that capture takes a capturable payment reference and answers with
 * the captured payment, and it documents the shape of an IBAN; both are
 * published, citable and ours to write down. What it does not document, and
 * what we would be inventing if we wrote it, is a rule about our entities: an
 * external invariant naming a modelled context's attribute is that system
 * promising something about our model, which is the reach rules would have
 * refused had any of them looked at an external context at all — they iterate
 * the modelled ones, so until card 116 nothing did (decision 28, amendment of
 * 2026-09-10, fourth).
 *
 * The shapes come from {@link guardedSchemas}, so the reach follows the flag
 * the same way a modelled context's does: a precondition reads the request it
 * is checked against, a postcondition the request and what comes back. A
 * standard's published rule about a value is left to the value objects, which
 * an external context has always been allowed to state (third amendment).
 */
function externalContractReach(
	bc: BoundedContext,
	invariant: Invariant,
): Set<Constrainable> {
	const reach = new Set<Constrainable>();
	for (const provider of [...bc.aggregates.values(), ...bc.services.values()])
		for (const consumable of provider.consumables.values())
			if (consumable.type === "operation") reach.add(consumable);
	for (const schema of guardedSchemas(invariant))
		for (const attribute of schema.attributes.values()) reach.add(attribute);
	for (const vo of bc.valueobjects.values()) {
		reach.add(vo);
		for (const attribute of vo.allAttributes) reach.add(attribute);
	}
	return reach;
}

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
 *
 * Two of those refusals turned out to be too wide, for the same reason and one
 * after the other. A value object's invariant is a standard's published rule
 * and stays (third amendment), and so is the contract of a published
 * operation: a payment provider documents that capturing needs a capturable
 * payment and what the capture answers with, and the merchant integrating with
 * it cannot be the one to promise that. So a context invariant flagged
 * `precondition` or `postcondition` on an operation of this same external
 * context is allowed. An invariant with neither flag is still a claim about
 * how the machine keeps itself, and a flagged one guarding another context's
 * operation is still this model promising for a system it does not own
 * (decision 28, amendment of 2026-09-10).
 *
 * That allowance was implemented at half its width, and this is the only rule
 * that reads an external context's invariant at all: every reach rule —
 * `invariant-in-context`, `precondition-names-operation` — walks the modelled
 * contexts. So a flagged external invariant could name no operation at all,
 * and could constrain an attribute of one of our aggregates, with nothing said
 * either time. Both are asked here now, against the reach a published contract
 * has (see {@link externalContractReach}; decision 28, amendment of
 * 2026-09-10, fourth; card 116).
 *
 * It is also not a big ball of mud. The two marks look alike — neither can be
 * held to completeness — and they say opposite things about ownership. A mud
 * context is the enterprise's own: somebody can be sent into it, its clusters
 * and its rules are ours to state as far as anyone can read them, and the
 * strategy is to carve it up. An external one is nobody here's to change, ever,
 * and stating its insides is invention. A context marked both leaves every
 * rule that reads one of the two flags to guess which reading the author meant
 * (decision 28; card 98).
 */
const externalIsBoundary: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		if (!bc.external) continue;
		const refuse = (what: string, ref: string, alternative?: string) =>
			diagnostics.push({
				severity: "error",
				rule: "external-is-boundary",
				message: `External context "${bc.name}" declares ${what}; what happens inside a system we do not own is not ours to state, only what it provides and what it consumes${alternative ? `. ${alternative}` : ""}`,
				ref,
			});
		if (bc.bigBallOfMud)
			diagnostics.push({
				severity: "error",
				rule: "external-is-boundary",
				message: `Bounded context "${bc.name}" is marked both external and a big ball of mud; a mud context is the enterprise's own, however unreadable, and an external one is somebody else's system, so a context is one or the other`,
				ref: bc.ref,
			});
		for (const aggregate of bc.aggregates.values())
			refuse(
				`aggregate "${aggregate.name}"`,
				aggregate.ref,
				`A kind this system publishes is a schema of this context, and an identity attribute of ours may name that schema instead of inventing the entity behind it`,
			);
		for (const policy of bc.policies.values())
			refuse(`policy "${policy.name}"`, policy.ref);
		for (const process of bc.processes.values())
			refuse(`process "${process.name}"`, process.ref);
		// A context invariant of an external context is refused for what it
		// usually is — a claim about how somebody else's system keeps its own
		// model — and allowed for what it sometimes is: the published contract
		// of one of that system's own operations. "Capture requires a
		// capturable payment" and "capture answers with the captured one" are
		// as citable as an IBAN's checksum, and the merchant cannot be the one
		// to promise them, so the provider states them where they belong. What
		// stays refused is an invariant with neither flag, which is a rule at
		// rest inside the machine, and a flagged one guarding another context's
		// operation, which is this model promising something about a system it
		// does not own (decision 28, amendment of 2026-09-10).
		//
		// Half of that was implemented and the other half was not, and this is
		// the only rule that looks at an external context's invariant at all:
		// `invariant-in-context` and `precondition-names-operation` walk the
		// modelled contexts, so a flagged external invariant could name no
		// operation and could reach into one of our aggregates with nothing
		// said (decision 28, amendment of 2026-09-10, fourth; card 116). Both
		// are asked here, where the reader already is.
		for (const invariant of bc.invariants.values()) {
			if (!invariant.precondition && !invariant.postcondition) {
				diagnostics.push({
					severity: "error",
					rule: "external-is-boundary",
					message: `External context "${bc.name}" declares invariant "${invariant.name}", which is neither a precondition nor a postcondition; a rule a system we do not own keeps at rest is not ours to state. What is ours to write down is that system's published contract: mark the rule a precondition or a postcondition of one of this context's own operations, or move it to the context of ours that really keeps it`,
					ref: invariant.ref,
				});
				continue;
			}
			const kind = invariant.precondition ? "precondition" : "postcondition";
			const guards = invariant.guarded.filter(
				(it) => it.type === "operation" && it.boundedcontext === bc,
			);
			if (guards.length === 0)
				diagnostics.push({
					severity: "error",
					rule: "external-is-boundary",
					message: `External context "${bc.name}" states ${kind} "${invariant.name}" on none of its own operations; what a system we do not own publishes is the contract of an operation it offers, so name that operation. ${externalContractMay}`,
					ref: invariant.ref,
				});
			const reach = externalContractReach(bc, invariant);
			for (const target of invariant.targets) {
				if (reach.has(target)) continue;
				const elsewhere =
					target instanceof Consumable && target.boundedcontext !== bc
						? `"${target.name}", an operation of "${target.boundedcontext.name}"; a system we do not own publishes the contract of its own operations and promises nothing about anybody else's. Move the rule to the context that provides the operation`
						: `"${constrainableLabel(target)}", which is not part of that contract. ${externalContractMay}`;
				diagnostics.push({
					severity: "error",
					rule: "external-is-boundary",
					message: `External context "${bc.name}" states a ${kind} on ${elsewhere}`,
					ref: invariant.ref,
				});
			}
		}
		// `internal` says a consumable never leaves its context, which is a
		// claim about what happens inside a system we do not run. What we can
		// say about somebody else's machine is what it offers and what it
		// takes; an operation or an event of theirs we know about is one we
		// know about because it reaches us or we reach it, and that is not
		// internal. An event is the same invention as an operation here: a
		// fact of theirs that nobody outside hears is a fact nobody outside
		// can know they raise (card 102).
		for (const provider of [...bc.aggregates.values(), ...bc.services.values()])
			for (const consumable of provider.consumables.values()) {
				if (!consumable.internal) continue;
				const kind = consumable.type === "event" ? "event" : "operation";
				diagnostics.push({
					severity: "error",
					rule: "external-is-boundary",
					message: `External context "${bc.name}" marks ${kind} "${consumable.name}" internal; whether an ${kind} of a system we do not own stays inside it is not ours to state, only that it exists and who it reaches. Drop internal, or drop the ${kind} if nothing here depends on it`,
					ref: consumable.ref,
				});
			}
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
 * Every `$ref` a loaded file writes names something, and something of the kind
 * the field it was written in can hold.
 *
 * A ref that names nothing is a mistake in the model, and a mistake is a
 * diagnostic. Until card 100 it was a crash: the loader resolved refs with the
 * `...OrThrow` lookups, so one typo in a fourteen-thousand-line file threw
 * before the first rule ran and the author was told about that ref and nothing
 * else. Worse, it fell only on the JSON author — an extension author editing a
 * file — because the DSL passes objects and the compiler refuses the wrong one
 * where it is written. The loader now leaves the link unset, and this reports
 * it beside everything else the file gets wrong.
 *
 * An error, not a warning: the link the author meant is not in the model, so
 * every map, page and rule downstream is reading a model with a hole in it. It
 * is also the one rule that says nothing about DDD; it is about the file.
 */
const unresolvedRef: Rule = (workspace) =>
	workspace.unresolved.map((it) => ({
		severity: "error" as const,
		rule: "unresolved-ref",
		message: `${it.owner} names "${it.target}" in "${it.field}"${
			it.where ? ` on ${it.where}` : ""
		}, ${
			it.present
				? `which is not ${it.expected}`
				: "but nothing in this workspace has that ref"
		}; the link is left unset until it resolves, so correct the ref or declare what it names`,
		ref: it.ref,
	}));

/**
 * The file was written against a metamodel this core reads.
 *
 * Five decisions promised that `odsVersion` would be bumped on a breaking
 * change, and it read `1.0.0` from the first commit because nothing ever
 * compared it: a file written against an older metamodel failed as
 * `unresolved-ref` or as rule errors that named the symptom rather than the
 * cause, and an author had no way to tell "this file is out of date" from
 * "this file is wrong". The major is what is compared, because that is what
 * the breaking decision bumps; a file that states no version at all predates
 * the version being written and gets the same diagnostic.
 *
 * An error, not a warning: what a reader is looking at is not the model the
 * file was written to describe. It still loads, and every other rule still
 * runs, because most of a file written against a neighbouring major is still
 * readable and the author is better off seeing the rest of it (decision 29,
 * noted 2026-09-10). Nothing here fires for a workspace built through the
 * DSL, which is written against this core by construction.
 */
const odsVersion: Rule = (workspace) => {
	const mismatch = workspace.odsVersionMismatch;
	if (!mismatch) return [];
	return [
		{
			severity: "error" as const,
			rule: "ods-version",
			message: mismatch.found
				? `This file was written against ODS ${mismatch.found}, and this is ODS ${ODS_VERSION}; the majors differ, so parts of it mean something else here or nothing at all`
				: `This file states no odsVersion, so it was written before ODS said which metamodel a file is written against; this is ODS ${ODS_VERSION}`,
			ref: "#/odsVersion",
		},
	];
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
		rule: "ods-version",
		severities: ["error"],
		summary:
			"The file states the ODS version it was written against, and its major is this core's.",
		why: "The metamodel's major is bumped by the decision that breaks it, so a file whose major differs was written against a model this reader does not read the same way: a field that has moved, a ref shape that has changed, a rule that now asks for something else. Until this rule existed nothing compared the version, and such a file failed as unresolved refs and rule errors that named the symptom rather than the cause. The file still loads and every other rule still runs, because most of it is usually still readable.",
		fix: "Regenerate the file from the DSL with this version of core, which writes the current odsVersion. A file written by hand should be brought up to the current metamodel and given the current odsVersion; never just edit the number, since the point of it is to say which model the rest of the file follows.",
		check: odsVersion,
	},
	{
		rule: "unresolved-ref",
		severities: ["error"],
		summary:
			"Every $ref a loaded file writes names something, and something the field it sits in can hold.",
		why: "A ref that resolves to nothing is a mistake in the model, and a mistake is a diagnostic rather than a crash. Loading used to throw on the first one, so a single typo in a large file cost the author every other diagnostic in it — and only the author writing JSON, since the DSL passes objects and the compiler refuses the wrong kind where it is written. The link is now left unset and reported here, and every other rule still runs over what did load.",
		fix: "Correct the ref, or declare the element it was meant to name. A ref that resolves to the wrong kind of thing — an answer where an event belongs, another process's deadline — is the same mistake: name one of the kind the field holds, or move the statement to the field that holds what you meant.",
		check: unresolvedRef,
	},
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
		fix: "Delete the relation and give the source an attribute holding the other entity's identity — an Order in Sales carries petId rather than a relation to Catalog's Pet. That identity may name a child of the other model as readily as its root, since the child is reached through that root. The dependency between the two contexts then reads where it belongs, on the context map: an identity across a boundary consumes nothing, so it draws there as an implied edge under the id stereotype rather than on the consumable map, which has nothing to draw when nothing is consumed. Where the entity really is one both contexts hold and change together, an entity has one home: give it to a kernel context the two share and consume its operations from each side instead of relating into each other's aggregate (decision 16).",
		check: crossContextRelation,
	},
	{
		rule: "identifies-entity",
		severities: ["error"],
		summary:
			"An attribute's identifies names an entity of this workspace, root or child, in any aggregate of any context, or a bounded context marked external or bigBallOfMud, or a schema an external context publishes.",
		why: "An identity attribute is how one part of the model depends on another without holding it: it says which thing out there this one is about, and it is the one dependency allowed to cross a bounded context (decision 14). That thing may be a child, because systems point at child identities constantly — a playback session names a profile inside a household, a claim a coverage inside a policy, a shipment an order's line — and the child stays inside its aggregate exactly because its parent's invariants need it there; you hold the child's id, with its root's id beside it, and reach it through that root, so the dependency is really on the aggregate the root leads. Holding the id is not reaching inside: what reaches inside is a relation into another aggregate's members, and cross-aggregate-reference refuses that and recommends this id in its place. It may also be a context whose insides the model does not state: a card scheme's authorisation id belongs to a system whose entities are not ours to state, and a legacy account key to one nobody can read well enough to say which entity it is of (decision 28), so the attribute names the system and the maps still draw the dependency. Where that system publishes a schema for the kind the id names — a processor's Customer beside its Payment, its Refund and its Dispute — the identity may name that schema and say which kind of id it holds, and the model reads it as an identity into that context (decision 28, third amendment). Any other context is refused, and so is a schema of one, because there the entity exists and naming the whole context, or a payload shape of it, would say less. What the id may never name is something this workspace does not have, since then it reaches nothing.",
		fix: "Point identifies at an entity of this workspace — the root when you deal with the whole, the child when the business really names the child, with the root's id beside it — or, for an id that belongs to a system you do not model inside or cannot read, at that system's bounded context, marked external: true or bigBallOfMud: true — or, where that external system publishes a schema for the kind the id is of, at that schema. Check the target has not been renamed or moved out from under the attribute.",
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
		fix: "Move the parent into the same aggregate as the kind, or the kind into the parent's; for a value object, declare the parent in this context, declare the shared kernel with the context that owns it if the two really do keep it in step, or declare this context a conformist of that one if it takes that model as it stands. Where the parent is an entity two contexts jointly own, the route is not a shared kernel between them: give the entity to a kernel context both consume, and hold the kind there too, since an entity has one home (decision 16).",
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
			"Inside an aggregate, includes and references point at entities and uses points at value objects, and every entity is reachable from the root.",
		why: "The aggregate is loaded and saved as one thing through its root, so the parts of one instance hang off it as a tree. That is a claim about instances, and the model declares types, so no ring in the type graph is reported at all: a questionnaire whose groups hold questions that hold groups is a finite tree in every instance, and so is a category of categories. Keeping the instance tree a tree is the code's job. What the type graph can say is checked: a uses onto an entity, and an includes or a references onto a value object, each say the opposite of what the author means. A value has no identity to point at and no life of its own to be part of, so neither pointing at one nor owning one is a thing to say; it is used. And an entity nothing reaches is either dead or a missing relation. A kind is reached wherever the entity it is a kind of is reached, since an instance of it is one of those; specialisation is not containment and never joins the tree itself.",
		fix: "Point includes and references at entities and uses at value objects, and give an unreachable entity the relation that reaches it — or move it to its own aggregate.",
		check: aggregateTree,
	},
	{
		rule: "attribute-relation-coherence",
		severities: ["warning"],
		summary:
			"A uses relation declared for an attribute typed by a value object agrees with it about how many there are, and where one value object is used twice each relation names with for the attribute it draws.",
		why: "The attribute list and the relation map are two views of the same statement, so the map draws the line from the attribute itself: an attribute typed by a value object is a dependency on that value, declared or not, exactly as it is for a value borrowed from another context where no relation may be written at all. A declaration adds a label or a cardinality to that line, and when it disagrees with the attribute about number the model says two things at once. Presence is not size: optional says whether the attribute is there and the cardinality says how many the value holds, so a required list may still hold none — Swagger's photoUrls is required with no minimum — and only three pairings are coherent. One value object may be used twice, a current address beside an address history, so with several relations to it each says with for which attribute it draws; the label stays the phrase the map reads. What a kind inherits counts as its own on both sides, so the pair may be completed by whatever it is a kind of.",
		fix: 'Give the relation the cardinality the attribute already implies, or add the missing attribute where a relation draws nothing: * or 1..* for a list whether or not it is optional, 1 for a required attribute that is not a list, 0..1 for an optional one that is not a list. Where two relations point at the same value object, set for on each to the name of the attribute it draws. The type itself is free text and is never checked against the value object\'s name; only a trailing [] is read, as "many".',
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
			"Every element a value object's invariant constrains is that value object, one of its attributes, or a value it composes and that value's attributes in turn.",
		why: "A value is defined by what it holds, and a rule about it is kept by refusing to make one that breaks it: an IBAN whose checksum fails is not a badly configured IBAN, it is not an IBAN. What the value holds includes the values it is made of — an itinerary is constructed from its legs, so each leg's arrival preceding the next leg's departure is as much a rule of the itinerary's construction as the checksum is of the IBAN's, and reading only the owner's own attributes forced such a model to flatten its legs to say it. What stays out of reach is everything off that path: a value object knows nothing of the entity holding it, of a value nothing it composes holds, or of any operation, so a rule naming one of those is a rule the value cannot keep.",
		fix: "Point the invariant at this value object's own attributes, or at those of a value it holds, followed as far as the composition runs: an Itinerary's invariant may name Leg.arrival because Itinerary.legs is typed by Leg. If the rule is really about the thing that holds the value — a transition, a balance across two entities — move it to that aggregate; if it is about several instances at once, it is the context's (decision 27).",
		check: invariantInValueObject,
	},
	{
		rule: "invariant-in-aggregate",
		severities: ["error"],
		summary:
			"An aggregate's invariant holds inside the boundary on every save, so every element it constrains belongs to that aggregate — an entity, an attribute, one of its operations — or is a value object something in the aggregate holds, its context's own or one borrowed from elsewhere, or is an operation of a service of its own context, application or domain, that guards it. A precondition may also constrain attributes of the schema the operation it guards takes and of what a call that guard, or the front that calls it, already made comes back with, and a postcondition those of the request, the answer and the refusals; both follow composition into the shapes those compose.",
		why: "Naming an operation says which operation keeps the rule; it does not say what kind of rule it is. The invariant says that itself, with precondition: set, it is checked before that operation runs and nothing re-establishes it afterwards — enough funds at initiation, an entitlement at playback start, a pet still available at approval. Unset, the operation is named for responsibility and the rule is still true after it: PostEntry must produce balanced postings and the postings stay balanced. The invariant's page says which of the two it is reading, because the two promise different things. Either way the boundary is the same: something outside it can change between one save and the next with nothing to stop it, so an aggregate cannot promise a rule stretched across two of them. A value object is one exception: it carries no state of its own and is saved as part of whichever aggregate holds one. The boundary holds instances rather than definitions, so a value borrowed over a shared kernel or conformed to upstream is inside it just as one of the context's own is, as long as an entity or a value in the aggregate holds one; a value nobody there holds is not, wherever it was declared. And a guard is the other: it is usually the aggregate's own operation, but decision 17 puts the public operation on the application service, and a guard that has to read two aggregates before it can say yes belongs to a domain service, so an operation of either kind of service of this context counts. A precondition reaches one place further still: what it checks is often in the request rather than in the model — pickup before delivery, a positive weight, on a quotation no aggregate holds yet — so it may name attributes of the schema its guarded operation takes, and of what its guard, or the front that calls it, already fetched: approve only if the customer is in good standing reads a standing that came back from another context before this call began, and the shape it came back in is a fact we hold. What it may not name is this call's own answer, which does not exist yet, or the other context's entities, which are never ours. A postcondition is the one that may name what that operation answers or refuses with, and the request beside it, since what it guarantees relates the two. Either follows composition, because the fields of a shape nested in a payload are fields the call carries: a rule about the amount of an order line is a rule about the request that holds the lines. No other invariant may name a schema's attribute at all: a rule kept true on every save is a rule about the model, and a transport shape is not the model.",
		fix: "Move the invariant to the aggregate that owns what it constrains, or drop the foreign target. If the target is a value object, give an entity of this aggregate an attribute typed by it — that is what says the aggregate holds one, and it is asked of the context's own values as much as of borrowed ones. If the rule really is about several instances or several aggregates — a uniqueness, a quota, a limit — it belongs to the bounded context instead, where it names the operation that checks it (decision 27). A service's operation, application or domain, is accepted when the service belongs to this aggregate's own context; one from a neighbouring context is not, because nobody here can keep a rule checked next door. If the rule is about the fields of a request, mark it a precondition and name the operation that receives them, and the attributes it may then constrain are those of that operation's own schema and of the shapes that composes; if it is a guarantee about what comes back, mark it a postcondition instead, which reaches the answer and the rejections as well as the request. If it reads a fact from another context, name the operation of this context that fetches it as a guard beside the transition, and constrain the attribute of what that call returns rather than the other context's entity.",
		check: invariantInAggregate,
	},
	{
		rule: "invariant-in-context",
		severities: ["error"],
		summary:
			"Every element a context's invariant constrains belongs to that context: an entity or attribute of any of its aggregates, a value object something in the context holds, its own or a borrowed one, or one of its operations. A precondition may also constrain attributes of the schema the operation it guards takes and of what a call that guard, or the front that calls it, already made comes back with, and a postcondition those of the request, the answer and the refusals; both follow composition into the shapes those compose.",
		why: "A context's invariant is the rule that holds across its own instances — one open application per customer, one active offer per seller and SKU — and the context can hold it because everything it counts is its own to read in one place. A value borrowed over a shared kernel is its own to read too, once one of its aggregates holds one: the instance is here even though the definition is not, and the holding is the whole question, asked of the context's own values as much as of borrowed ones. A rule reaching into another context's entities, or into a value nothing here holds, counts what a neighbour owns or what nobody keeps, which is a consistency no boundary offers. That rule is a policy or a process reacting to the other context's events instead. A precondition is the one rule that may look at a request: it runs before the call, and what it checks — pickup before delivery, a positive weight — is often in the call rather than in anything saved, so it may name attributes of the schema its guarded operation takes, and of what its guard, or the front that calls it, already fetched from elsewhere. That is as far as it reaches: this call's own answer does not exist when the check runs, and the other context's entities are never in reach. A postcondition is its mirror and may name what that operation answers or refuses with, and the request it relates them to. Either follows composition into the shapes those compose, because the fields of a nested shape are fields the call carries.",
		fix: "Point the invariant at this context's own model, or at a value object its aggregates hold — give an entity or a value here an attribute typed by it, which is what says the context holds one — or move the rule to the context that owns what it counts. A context with no entity at all cannot be given one just to hold a value object; a quotation service that stores nothing has no aggregate to reach for, so a rule of its own is a precondition or a postcondition on its operation instead, naming the schema's attributes rather than the value object (decision 27, third amendment) — or, where the value really is state this context should keep, add the aggregate that holds it. Where the two contexts really must agree, model the reaction: the other context raises an event and a policy here issues the operation that responds. If the rule is about the fields of a request, mark it a precondition and name the operation that receives them; if it is a guarantee about what that call answers with, mark it a postcondition instead.",
		check: invariantInContext,
	},
	{
		rule: "context-invariant-is-checked",
		severities: ["error"],
		summary:
			"A context's invariant is a check, so it names at least one operation of that context that makes it — before that operation acts, or of what it answers with.",
		why: "No instance can see its siblings, so nothing enforces a cross-instance rule as a side effect of being saved. It holds only because something checks it: the operation that refuses the second open application, the one that counts the household's open sessions before starting another. Naming that operation is the difference between a rule the model can be read for and a sentence with nowhere to look. The model records who checks the rule, not how strongly the store holds it: a unique index or a serialisable transaction may keep the same rule true at the database layer as well, and this rule neither claims nor denies that, because its only unit of consistency is the aggregate. What a context invariant may not claim is that it is kept on every save, the way an aggregate's is; that is the model's own rule about what a context boundary can promise, not a fact about any particular system. Which side of the call the check falls on is the invariant's own to state, with precondition or postcondition, and neither of those claims the rule holds at rest — a context with no aggregate at all, a quotation service that stores nothing, states the contract of its own operation exactly that way. A flagged invariant is asked for its guard by precondition-names-operation and postcondition-names-operation, so this rule asks the unflagged one and the model is told once rather than twice.",
		fix: "Name the operation that does the checking in constrains, alongside what the rule is about. If the check is made on the way in, mark the rule a precondition; if what is checked is the answer, mark it a postcondition. If no operation checks it, the rule is not being kept: either the check belongs somewhere and has not been modelled, or the rule holds inside one aggregate and belongs there instead.",
		check: contextInvariantIsChecked,
	},
	{
		rule: "precondition-names-operation",
		severities: ["error"],
		summary:
			"An invariant marked a precondition names at least one operation it guards.",
		why: "A precondition is a rule checked at one moment — before a particular call runs — and not kept true afterwards. Marking one without naming that call says a rule stops holding after something the model never identifies, which leaves a reader with a sentence and nowhere to look for the check. It is also how the flag stays a statement rather than a way of quietly weakening every rule it is put on.",
		fix: "Name the operation that does the checking in constrains, alongside what the rule is about. If nothing checks it before acting, the rule is not a precondition: drop the flag, and the operations it names — if any — keep it and it holds after them.",
		check: preconditionNamesOperation,
	},
	{
		rule: "postcondition-names-operation",
		severities: ["error"],
		summary:
			"An invariant marked a postcondition names at least one operation it guards, and is not also marked a precondition.",
		why: "A postcondition is a guarantee about what a call answers with: every returned itinerary meets the requested deadline, every quoted premium is inside the band the schedule allows. The answer does not exist until the operation runs, so a postcondition that names no operation is a promise about the answer to a question nobody asked. And a rule marked a precondition as well says two things about when it holds — checked beforehand against something that may since have moved, and guaranteed of what came back — so every reader of the flag, the page that names the kind and the reach the rule gets over a payload among them, has to pick one and would pick differently.",
		fix: "Name the operation whose answer this is a guarantee about in constrains, alongside the attributes of what it returns or rejects with. If the rule is really checked on the way in, it is a precondition instead: drop postcondition and set precondition, which reaches the request. If it is neither — a rule kept true on every save — drop both flags and let the operations it names keep it.",
		check: postconditionNamesOperation,
	},
	{
		rule: "relationship-roles-backed",
		severities: ["warning"],
		summary:
			"A directed relationship's declared roles are carried by the crossings that belong to it — or, for published language and for either downstream role, by the downstream borrowing the upstream's shapes — and a crossing consumption's role is declared on the agreement it belongs to.",
		why: "The context map and the consumable map are the same integration told twice, strategically and concretely. A role on the map that nothing carries is a claim about a team's way of working with nothing behind it, and a consumption whose role the map never mentions is an integration decision made without the map noticing.",
		fix: "Set the matching pattern on the consumable the downstream context consumes, or on the consumption, or take the role off the relationship if the integration is not really like that. A published-language role is backed by any crossing consumable carrying a shape — sent, answered or refused — since a published language is a data shape rather than a second flag, and equally by the downstream naming one of the upstream's schemas or value objects: a standards body publishes a language and offers nothing to consume, so the shapes borrowed from it are the whole of what it provides. The two downstream roles are backed by different things, because they are different acts. A conformist is backed by that same borrowing: a context naming one of the upstream's schemas or value objects has taken its language. An anti-corruption layer is not a borrowing at all — the model behind it stays the downstream's own — so it is backed either by a consumption that declares the role or, where the upstream is the caller and nothing crosses the other way, by the one consumable that caller reaches carrying the caller's own shape, which is the boundary the layer translates at. Where one pair holds two agreements in the same direction, each is read against its own traffic: a crossing counts for the agreement its relationship names, or for the pair's only one where it names none. A crossing that names neither is consumption-agreement's to report and says nothing about either agreement until it does.",
		check: relationshipRolesBacked,
	},
	{
		rule: "consumption-agreement",
		severities: ["warning"],
		summary:
			"A consumption crossing a pair that has more than one directed relationship in that direction names, in relationship, which agreement the exchange belongs to — and what it names is an agreement joining those two contexts, either way round.",
		why: "One pair may hold two agreements in one direction: a negotiated fulfilment API beside a tolerated legacy feed from the same warehouse, each with its own roles, comments and disposition. The exchanges are what those roles are claims about, so an exchange that belongs to neither leaves both agreements judged by traffic that is not theirs — each is told nothing carries its upstream role while the crossing that does belongs to the other, and each is told about the other's downstream role as though it were an undeclared one. The direction is read off it too: which context dictates the model is the agreement's to say, and with two of them the answer was whichever came first in the file. Where the pair holds one agreement nothing is asked, because there is nothing to tell apart.",
		fix: "Set relationship on the consumption to the agreement this exchange really runs under, using the ref that carries its name. It may point either way between the two contexts: upstream is whoever dictates the model, so an exchange whose caller is the upstream runs under an agreement that points against the traffic. If the exchange belongs to neither of them, it belongs to a third agreement nobody has declared yet — declare it. If the two agreements are really one, merge them and the question stops being asked. A consumption reported here belongs to no agreement, so relationship-roles-backed says nothing about it until it names one.",
		check: consumptionAgreement,
	},
	{
		rule: "relationship-declared",
		severities: ["warning"],
		summary:
			"Two contexts joined by a crossing — a consumption of the other's consumable, a policy or process reacting to the other's event, or an attribute typed by the other's value object — declare a relationship, in either direction.",
		why: "Decision 03 made the relationship the place where the terms of an integration are written: who is upstream, what the provider commits to, whether the consumer translates. A consumption or an identity with no relationship still draws on the context map, as a dashed implied edge, but that edge only says a dependency exists; the relationship is what says on what terms, and it is the thing a team can argue about, comment on and change. A subscription counts because reacting to a neighbour's event is an integration by another route, the same one separate ways forbids and a partnership is backed by; the map draws it through the consumption subscription-consumed requires. An identity an entity holds is a real dependency and the context map draws it, under an id stereotype, but it is not asked for a relationship: asking produced fourteen upstream-downstream relationships across the reference models with no roles at all, each commented to say that nothing is exchanged, which is a shape DDD does not have. A relationship is declared where something is exchanged or a language is borrowed.",
		fix: "Declare the relationship the two contexts really have, naming both of them: upstream-downstream or customer-supplier pointing from whichever context dictates the model to the one that takes it, or a partnership or shared kernel if they meet as equals. Any of them counts whichever way round the crossing runs, because the arrow is a claim about who sets the language and not about who calls whom — a card processor that sends its own format is upstream of the bank that provides the operation. A pair that has declared separate ways has answered this question and is left alone here; what is wrong with a crossing across one is that it contradicts the declaration, which separate-ways reports as an error. If neither context should depend on the other, remove the crossing rather than declaring a relationship for it.",
		check: relationshipDeclared,
	},
	{
		rule: "relationship-duplicate",
		severities: ["error"],
		summary:
			"A pair of contexts declares at most one unnamed directed relationship per direction and at most one unnamed relationship of each symmetric type; two agreements in one direction each carry a name of their own, and a symmetric type has no direction, so either order counts as the same one.",
		why: "A relationship is the one model element with no id of its own — its ref is the two contexts, the type, and the name where it has one. Declare the same one twice and both carry the same ref, so only the first can ever be reached: the second's description, comments and disposition are written somewhere no reader, link or tool will land, and the model has quietly lost them. Declare an upstream-downstream and a customer-supplier the same way round, both unnamed, and the two are both reachable and both drawn, contradicting each other on the one thing the type says — whether the downstream has a say in the upstream's planning — and splitting the roles across two rows that no rule reads together. A name is what turns the second row into a second agreement: a negotiated fulfilment API and a tolerated legacy feed from the same warehouse are two things the pair has agreed, each with its own roles, comments and disposition, each at its own ref, and the map draws them as two lines with their names on.",
		fix: "If the two rows are one agreement said twice, keep a single declaration between the pair and give it every upstream and downstream role the crossings carry, then delete the other; between one pair in one direction, choose customer-supplier when the downstream has a say in the upstream's planning and upstream-downstream when it does not. If they really are two agreements, give each a name that says which is which. Two contexts that each depend on the other are a different case again: that is one directed relationship each way, and both are kept.",
		check: relationshipDuplicate,
	},
	{
		rule: "relationship-cycle",
		severities: ["warning"],
		summary:
			"The directed relationships whose traffic is calls form no cycle; calls carried only by events, calls the consumption declares an anti-corruption layer on, and calls between partners do not count.",
		why: "Downstream means a context shapes its model around what the upstream offers. In a ring of calls the contexts depend on each other's contracts: each one is written against a neighbour's model that is written against its own. Two kinds of call are exempt because neither creates that dependency. Events are one: reacting to a fact commits nobody to another model's shape, and rings of reactions are reaction-cycle's business instead. An anti-corruption layer is the other: the downstream translates at its edge, so the upstream's contract stops there and each side stays free to change, which is the whole point of the pattern. The layer is read on the consumption that declares it, because that is where the model says which call is translated; read off the relationship's roles, one translated call excused every untranslated one beside it. A partnership is the third: two contexts that plan their releases as one are one node for this walk, so what runs between them is not a step, and a ring that is nothing but the pair is cleared by declaring it. A longer ring is not, and the message says so: the pair still calls, and is still called by, the rest of the ring.",
		fix: "Put an anti-corruption layer on the consumptions that carry a step, so that context translates what it calls and can change behind it; or declare a partnership between two neighbours on the ring that really do move as one, which says the mutual dependency is deliberate and makes the two one context for this walk; or reverse a dependency by turning that call into an event the other side reacts to. A command carried over a queue is still an operation and still counts as a step on the ring, since this rule reads kind rather than delivery; where that assumption is the wrong read of a real system, say so in a comment on the consumption rather than looking for a fourth kind of exemption.",
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
			"A downstream that declares the conformist role takes something of its upstream's: a schema or value object named here, or anything the upstream provides consumed here.",
		why: "Conformist is the strongest thing a downstream can say about itself: it gives up its own language for the upstream's and accepts every change the upstream makes. It is also what lets this context name the upstream's schemas and value objects at all, so a reader takes it as the warrant for a borrowing. Declared between two contexts that exchange nothing at all, it is a claim on the map with nothing under it, exactly as an empty shared kernel or an unbacked partnership is. What the rule does not ask is that the conforming show in the shapes: whether a downstream subscribing to a published event translates it or takes it as it comes is not something the model records, so asking for a borrowed schema would report every event-driven conformist there is. It does not ask for a payload either: a consumed event whose name is the whole of it is still the upstream's language, and demanding a schema on the event reported the conformists of contexts that publish bare notifications.",
		fix: "Consume something the upstream provides, of any kind and with or without a payload, or name one of its schemas or value objects here; or drop the conformist role if the two contexts really exchange nothing.",
		check: conformistBacked,
	},
	{
		rule: "mud-needs-acl",
		severities: ["warning"],
		summary:
			"A consumption from a big ball of mud declares the anti-corruption-layer downstream role.",
		why: "A big ball of mud has no coherent model to conform to. Taking its shapes as they come drags its confusion across the boundary, and the consumer's own language starts to look like the legacy one. The rule reads consumptions, because that is where the mess actually enters a context; an identity attribute that merely names a mud context is not itself a crossing, and treating it as one used to let a context that received a legacy key at second hand, through a third context, clear the warning only by inventing a consumption it had no other reason to make (decision 28, amended; card 108).",
		fix: "Set pattern: anti-corruption-layer on the consumption and translate at the edge. Or drop bigBallOfMud if the context is no longer one.",
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
			"Where the provider of a consumable is the upstream side, the consumable declares an upstream role and the consumption a downstream one — unless the two contexts are partners or share a kernel.",
		why: "Crossing a context boundary is an integration decision: how the upstream offers what it offers (a documented API or a published format) and how the downstream takes it (as-is or translated) should be explicit. Which end is which is the relationship's to say, not the call's: upstream is whoever dictates the model, so where the caller sends its own format and the provider translates it, the provider is downstream of the context calling it. A consumable can carry only an upstream role and a consumption only a downstream one, so in that case neither field is the right place for either role — the roles are on the relationship, and relationship-roles-backed reads them there. Partnership and shared kernel are the other exception: neither side is upstream, so there is no role for either end to declare.",
		fix: "Set pattern on the consumable to open-host-service or published-language, and pattern on the consumption to conformist or anti-corruption-layer; or declare the partnership or shared kernel that makes the two contexts equals. If the warning is on an integration where the caller dictates the format, the relationship is the wrong way round: declare the caller upstream, with the roles on the relationship, and this rule stops asking. Where the pair holds two agreements, which direction this exchange runs under is the exchange's to say: name it in the consumption's relationship.",
		check: roleCoherence,
	},
	{
		rule: "separate-ways",
		severities: ["error"],
		summary:
			"Contexts that declare separate ways exchange no consumables, react to none of each other's events, hold none of each other's identities and borrow none of each other's value objects.",
		why: "Separate ways is a deliberate decision not to integrate, so it rules out every crossing the model can record and not only the consumption. A policy subscribing to the other's events is the same integration by another route. An identity naming the other context's entity is a dependency on that context's identity scheme, stored here and true until somebody edits it. An attribute typed by the other's value object is that context's language in this one. This is the only rule that speaks about a crossing across a declared separate ways: relationship-declared asks whether the pair has been described at all, and a pair declaring separate ways has described itself, so saying beside this error that no relationship says how the two stand was untrue and made one mistake report twice.",
		fix: "Remove the crossing — the consumption, the subscription, the identity attribute or the borrowed type — or remove the separate-ways relationship and declare the real one the two contexts have.",
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
		rule: "consumption-by-reactor",
		severities: ["error"],
		summary:
			"A consumption of an event names policies and processes in its by; an operation may only be named on a consumption of an operation.",
		why: 'A subscription is not made, it is woken: the fact arrives and a policy or a process of the consumer\'s context runs. An operation is issued by something, so naming one here says a thing that does nothing when the fact arrives is what takes it in, and the reaction walk stops there — the reader is shown an event coming into a context and nothing that happens next. Ten consumptions across the reference models were written this way, most of them meaning "this is the part of us that cares", which is a reaction nobody had written down yet.',
		fix: "Write the reaction: a policy or a process of the consumer's context that reacts to the event and issues a local operation, then name that reactor in by. For a projection or a report, the local operation is the one that writes what the query later reads. If nothing here reacts, delete the consumption.",
		check: consumptionByReactor,
	},
	{
		rule: "consumption-by-required",
		severities: ["warning"],
		summary:
			"A consumption of an operation names, in by, which of the consumer's own operations makes the call — unless the consumer provides fewer than two operations, or the consumer's context is external or a big ball of mud.",
		why: "by is the only causal link the model has from one operation to the next: the flow map and the reaction walk follow it from a local operation through the consumption to the operation it calls and on to what that raises. Without it a lifecycle running through three contexts reads as three unrelated stubs, each stopping at the edge, and the reader is told only that some part of a six-operation service depends on a neighbour — which is barely more than the context map already said. A call next door costs the same silence: a front on a two-operation application service that calls an aggregate without saying which of its operations does reaches no events at all, and the flow map stops there with nothing said about why. Which of the consumer's operations calls out is not askable of every consumer, though: inside an external context or a big ball of mud it is a system nobody here owns or can read, and naming a caller in one is invention.",
		fix: "Name the consumer's own operations that make this call in by. Pick from the operations the message lists; if several of them call out, name them all. A consumer with one operation needs nothing, because that operation is the answer, and neither does a consumer inside somebody else's system.",
		check: consumptionByRequired,
	},
	{
		rule: "subscription-consumed",
		severities: ["error"],
		summary:
			"A policy or process whose on, starts or ends names another context's event has a consumption of that event somewhere in its own context.",
		why: "Reacting to a neighbour's published fact is an integration, and decision 17 says a subscription is a consumption. Written only as a subscription it is nowhere else in the model: neither the context map nor the consumable map draws the dependency, no downstream role says whether the fact is translated or taken as it comes, and the rules that judge an exchange — the anti-corruption layer a big ball of mud needs, the roles a relationship claims — never see it at all.",
		fix: "Declare the consumption on the application service that owns the reaction, which is the node providing the operations the reactor issues, and name the policy or process in its by. Give it the downstream role the reaction really has: conformist if the event is taken as published, anti-corruption-layer if something translates it. If the reactor should not depend on that context, react to an event of your own instead.",
		check: subscriptionConsumed,
	},
	{
		rule: "subscription-backed",
		severities: ["warning"],
		summary:
			"A consumed event is reacted to by a policy or a process of the consumer's context.",
		why: "subscription-consumed asks the other half of this question, and between them the two say that a subscription and its reaction are one fact written from two sides. A consumption with no reaction is a claim with nothing under it: the model says this context takes that fact in, nothing in it does anything when the fact arrives, and the consumable map draws an edge a reader cannot follow anywhere. Usually the reaction was never written down; sometimes the dependency is stale. Naming an operation in by used to clear it, on the reading that a projection or a report was what the subscription was for; an operation is issued rather than woken, so that named something which does not run when the fact arrives, and consumption-by-reactor now refuses it.",
		fix: "Add the policy or process that reacts to the event and name the local operation it issues in its then — for a projection, the operation that writes what the query reads. If nothing here acts on the fact, delete the consumption: the dependency is not real.",
		check: subscriptionBacked,
	},
	{
		rule: "process-in-context",
		severities: ["error"],
		summary:
			"A process issues operations of its own bounded context, and starts on an event or on one of its own context's operations; what it waits for and what ends it may be another context's events.",
		why: "A process is its context's own way of running something that takes several facts to finish, and like a policy it may only act through its own model: reaching into a neighbour to run an operation there is that context acting through someone else's model rather than through the boundary they published. Listening is different — subscribing to published facts is how contexts integrate — so the events a process starts on, waits for and ends on may cross where the operations it issues may not (decision 23).",
		fix: "Give the process's own context an operation that consumes the foreign one — an application service operation is the usual place — and name that in then. If the foreign operation is what starts an instance, start on the event that call raises instead: a neighbour's command is not this context's to say creates its instances, but a neighbour's published fact is something this context may listen for.",
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
		summary:
			"A process names at least one event, or one operation of its own context, that begins an instance.",
		why: "A process has instances, and an instance begins when some fact arrives or some command creates one: without either the model never says when a process exists, so there is nothing to correlate the later events against and nothing for a reader to follow the chain back to. A command starts a saga as often as an event does — open a claim, submit an application — and allowing only an event sent authors back to inventing a fact for the call they already had. An answer and a deadline still start nothing: a caller has to have made the call to hear it come back, and a deadline counts from the moment an instance began waiting, so both need the instance to exist already.",
		fix: "Put the event, or the operation of this context that creates an instance, in starts. If the process really reacts to anything at any time, it is a policy, not a process.",
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
			"An aggregate's operations declare no upstream role and are consumed only inside their own context, or by a context that shares a kernel with it.",
		why: "An aggregate is a consistency boundary, not an integration boundary. When it offers operations outward as well as the application service in front of it, nothing in the model says which of the two is the context's public surface, and a caller outside can change the aggregate without passing the service that guards it. Its events are unaffected: publishing facts is how a context speaks outward. A shared kernel is the exception: the kernel is code its sharers run as their own, so an aggregate two teams maintain together — a Product with its unit conversions — is reached through its operations by each sharer, which is what backs the relationship in the first place (decision 16).",
		fix: "Mark the aggregate's operation internal: true and drop its pattern, then give the context's application service the public operation that consumes it; point the outside caller at that one. If the two contexts really do own this model together, declare the shared kernel and the call is the sharing.",
		check: aggregateNotPublic,
	},
	{
		rule: "aggregate-consumes-inside",
		severities: ["error"],
		summary:
			"An aggregate consumes only consumables of its own bounded context, and never another aggregate's operation.",
		why: "An aggregate is a consistency boundary, not a client. A call out of the context is translation, latency and someone else's availability, and none of that belongs inside the transaction that holds an invariant true; an aggregate that waits on a neighbour has made that neighbour part of its consistency boundary. Calling the aggregate next door is the same act with a shorter wire: each is saved in its own transaction, so the call spans two of them, and it does so invisibly — no map draws a dependency between two clusters of one context and no relationship describes it. The context's application service owns the use case and calls out, a policy is how the context reacts to a fact from outside, and an event another aggregate published is fine to consume because nothing waits on it.",
		fix: "Move the consumption to the service that owns the use case, naming its own operation in by where the caller plainly differs, and let that operation pass the result to the aggregate; for a foreign event, add a policy on that event issuing an operation of this context.",
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
			"A domain service's operations declare no upstream role and are consumed only inside their own context. Not asked of an external context, whose service type nothing reads.",
		why: "A domain service holds domain logic that belongs to no single aggregate — it is the inside of the model, the same as an aggregate. Offering it outward makes another context depend on how this one arranges its logic instead of on what it promises. A system we do not own has no inside for that distinction to be about — what we know of it is the operations it offers us — so the type of an external context's service is not read, and a provider that documents its API as a domain service is not made to rewrite the word to keep the validator quiet.",
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
			"A schema named by a consumable's payload, by its returns, by one of its rejections or by a nested attribute belongs to the naming element's own context, to one it shares a kernel with, or to an upstream it has declared itself a conformist of; a consumable may also carry the shape of an upstream it translates behind an anti-corruption layer.",
		why: "The context that publishes a message owns its shape; borrowing another context's schema ties the two together so neither can change it alone. A nested schema is the same borrowing one level down. Two declarations say the tie is intended. A shared kernel is where two teams have said they keep part of one model between them and accepted the price. A conformist is a downstream that has said it takes the upstream's model as it stands rather than translating it, which is exactly what carrying the upstream's shapes is — it is how a regulator's formats or a scheme's record layouts enter a model honestly. That borrowing runs downstream only; the upstream is never shaped by its conformists. An anti-corruption layer is the third case and belongs to consumables alone: upstream is who dictates the language, so a caller that sends its own format is upstream of the context it calls, and the operation it reaches carries the caller's shape with the translation behind it. An attribute is inside the model and past the layer, so it gets no such exception.",
		fix: "Move or copy the schema into the publishing context and point the consumable or attribute at that one; or declare the shared kernel if the two contexts really do keep that shape between them; or, if this context genuinely takes the other's model as it stands, declare the directed relationship with conformist among its downstreamRoles; or, where the other context is the caller and this one translates its format at the boundary, declare that context upstream with anti-corruption-layer among this one's downstreamRoles and let its consumption of this operation say that it calls it.",
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
		why: "An event is a fact that happened, an operation is a request to do something; mixing them up makes flows unreadable. A reaction may also wait on an answer — a shape the call comes back with, or one of the outcomes a refusal enumerates — and then two things have to hold: the operation declares that answer, and the reactor can hear it come back — because its context consumes the operation — through a `by` naming an operation the reactor issues, or through the context's one silent consumption where the consumer has a single operation to infer — or because the reactor issues the operation itself, which is the local call-and-branch. Where the consumer provides several operations and `by` says nothing, nobody has said who called, and the walk draws no answer step either. An operation that returns nothing answers with its bare completion, and that is an answer like any other; an operation that does answer with a shape has no separate completion, because naming one would be a second name for the same call coming back.",
		fix: "Check the type of each consumable a policy or raises list points at and swap it for the right kind. For an answer, either declare it on the operation it is named from — a shape in returns or rejects, an outcome in that refusal's reasons — or issue or consume that operation; where the operation returns a shape, wait for that shape rather than for the operation completing. Where the consumer provides several operations, name the one that makes the call in the consumption's `by`, which is the same thing `consumption-by-required` asks for. A process starting on an operation is not a reaction at all and is left to process-in-context.",
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
		why: "A ring of reactions runs forever unless something outside the model stops it, and nothing in the model says what that something is. Whoever reads the model next cannot tell whether the loop is a bug or a legitimate retry with a condition that was never written down. A process is walked the same way, with two exemptions that are the whole point of it. A process fed by its own steps — it issues an operation, the operation raises the event it waits for next, and so on to the end — is a lifecycle, not a ring, because the process holds state and declares what ends it (decision 23). And a ring on which one process sits and every other reactor is a policy that only translates — hearing its event through an anti-corruption-layer consumption and republishing it as its own context's fact — is that process's lifecycle carried through the layer, not a second reactor (decision 23, amended 2026-09-10, second); the policy has to be translating on this ring — woken here by its anti-corruption subscription and leaving here by an operation that raises the event carrying the ring on — and not merely to have such a subscription somewhere. A process the ring merely calls is not a second reactor either: where the ring enters a process on one of its `starts` and leaves it on one of its `ends`, that is a call at process granularity — a triage process booking with a scheduling process and hearing the slot — and the instance it made was born on the way in and finished on the way out, so nothing on the ring keeps it alive (decision 23, amendment of 2026-09-10, second). So a cycle is reported only when the walk comes back to a reactor other than that process, such a translating policy or such a called process: a ring through two processes each waiting on it while alive, or through a process and an ordinary policy, is a genuine loop and is reported. Both exemptions ask for one more thing, that the ring comes back to an instance already running: a process that hears the event coming back — round its own steps or through the layer — as one of its `starts` makes a new instance every time round, so no instance's state holds the ring together and nothing says what stops the next one; that ring is reported as a cycle that spawns instances, in those words (card 113). A ring with no policy or process on it at all is not a chain of reactions — nothing on it wakes on anything — so it is worded as calls rather than reactions, and reported once: where every step of it crosses a context, `relationship-cycle` already reports the same ring as a ring of calls between contexts, and this rule stays quiet there (decision 20, note of 2026-09-10).",
		fix: "Break the ring, usually one of the policies is reacting to too broad an event or issues an operation it should not. Where the ring closes on a process's own starting event, the step that restarts it is the one to look at: wait on that fact with `on` if the instance is meant to carry on, or raise a different event if a fresh instance is really meant each time and say in the process's description what stops the next one. If the loop is a real feedback loop that converges, say what ends it in the description of the policy that closes the ring; the model has no conditions on purpose (decision 15), so the ending condition is prose a reader finds where the loop closes, and the warning stands to send them there. If the ring is nothing but calls with no reactor at all, the fix is `relationship-cycle`'s: an anti-corruption layer, a partnership, or turning a call into an event.",
		check: reactionCycle,
	},
	{
		rule: "context-serves-subdomain",
		severities: ["warning"],
		summary:
			"Every bounded context serves at least one subdomain, except an external one and a shared kernel context.",
		why: "A context that serves no subdomain has no place in the problem-space view, so nobody can see which part of the business it exists for. An external context was never in that view: a card scheme or a licensor is not part of anybody's problem space here. A shared kernel context is under all of it rather than outside it — a library of Money and AccountNumber serves whatever its sharers serve — so asking it for a subdomain of its own only invents one.",
		fix: "Add the subdomain the context serves to its subdomains list. If the context is somebody else's system, mark it external. If it is a kernel two or more contexts share and nothing else, every relationship it has is a shared kernel and the rule leaves it alone.",
		check: contextServesSubdomain,
	},
	{
		rule: "external-is-boundary",
		severities: ["error"],
		summary:
			"An external context declares no aggregates, no policies, no processes and no internal operations or events, and is not a big ball of mud as well; its value objects may carry invariants and it may state a precondition or a postcondition on one of its own operations, because a published contract is citable. Such an invariant names one of that context's own operations and constrains only the attributes of the shapes that operation carries and the context's own value objects.",
		why: "An external context is a system the enterprise does not own: a card scheme, a payment provider, a licensor, a clock. What it offers and what it takes are ours to write down, because we depend on them; how it keeps its own model is not, because we cannot know it and anything the model says about it is invention a reader would take for fact. Its value objects stay, because they are the vocabulary our own model has to carry, and the rules on those values stay with them: an IBAN's mod-97 checksum or an ISO 20022 field rule is the standard's published contract, known and citable, not a guess about somebody's insides. The contract of one of its own operations is the same kind of published fact: a payment provider documents that capturing needs a capturable payment and what the capture answers with, and the merchant integrating with it is in no position to promise that, so the rule is stated where it is published — as a precondition or a postcondition of that provider's own operation. A rule with neither flag is different, because a rule the machine keeps at rest is exactly the invention we cannot make, and so is a precondition guarding somebody else's operation. The reach is the contract and nothing beside it: a flagged rule that names no operation at all is a contract about nothing, and one that constrains an entity of ours is that system promising something about our model. Neither was reported until card 116, because every reach rule walks the contexts whose insides we state and an external context is not one of them. Internal is the same invention in one word: it says an operation, or an event, never leaves that system, and the ones of somebody else's system we can name at all are those that reach us or that we reach. A big ball of mud is the opposite kind of unknown — the enterprise's own system, unreadable but ours to carve up — so a context marked both leaves every rule that reads one of the two flags guessing which reading was meant.",
		fix: "Drop internal from the operation or the event, which is a fact about that system's insides. Move the aggregate, policy or process into the context of ours that actually holds it, or drop external: true if this is a system the enterprise really does model inside. Where the aggregate was standing in for a kind that system publishes, the honest form is a schema of this context rather than an invented entity: declare the schema and let an identity attribute of ours name it directly. For an invariant, the question is which of two things it is. If it is the published contract of one of this context's own operations, mark it precondition (checked before that operation runs) or postcondition (guaranteed of what it answers with) and name that operation in constrains; both flags are allowed here and one of them is required, because an unflagged rule is a claim about the machine at rest. What it may then constrain is the attributes of that operation's request and answer shapes and this context's own value objects; anything else names something the provider does not publish. If it is a rule about several instances of a context of ours, or a precondition guarding another context's operation, move it to the context that keeps it. A rule that a value of a published standard always satisfies belongs on the value object itself, where it may stay. Where both flags are set, keep the one that says who may change the system: external for somebody else's, bigBallOfMud for ours.",
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
