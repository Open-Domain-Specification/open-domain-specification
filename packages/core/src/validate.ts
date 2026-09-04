import {
	dispositionOf,
	intentsWithoutComments,
	relationshipsWithoutComments,
	type StrategicIntent,
} from "./evidence";
import type { UpstreamRole } from "./schema";
import {
	Aggregate,
	Attribute,
	type AttributeOwner,
	type BoundedContext,
	type Constrainable,
	Consumable,
	Consumption,
	ContextRelationship,
	constrainableLabel,
	type DataSchema,
	Entity,
	type EntityRelation,
	isDirectedRelationshipType,
	Policy,
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

function* aggregatesOf(workspace: Workspace): Iterable<Aggregate> {
	for (const bc of workspace.boundedcontexts.values())
		yield* bc.aggregates.values();
}

/** Everything that can hold attributes and relations, in declaration order. */
function* modelMembersOf(workspace: Workspace): Iterable<Entity | ValueObject> {
	for (const bc of workspace.boundedcontexts.values()) {
		yield* bc.valueobjects.values();
		for (const aggregate of bc.aggregates.values())
			yield* aggregate.entities.values();
	}
}

/** Everything one context declares that carries attributes. */
function* attributeOwnersIn(context: BoundedContext): Iterable<AttributeOwner> {
	yield* context.schemas.values();
	yield* context.valueobjects.values();
	for (const aggregate of context.aggregates.values())
		yield* aggregate.entities.values();
}

/** The same walk across the workspace, each owner with the context it is in. */
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

function* consumptionsOf(workspace: Workspace): Iterable<Consumption> {
	for (const bc of workspace.boundedcontexts.values()) {
		for (const member of [...bc.aggregates.values(), ...bc.services.values()]) {
			yield* member.consumptions;
		}
	}
}

/** Every aggregate has exactly one root entity. */
const aggregateRoot: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of aggregatesOf(workspace)) {
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

/**
 * A relation into another aggregate may only reference that aggregate's root,
 * and may not include or use its members directly. A value object at either
 * end crosses no aggregate boundary: it belongs to the context, and every
 * aggregate of that context may hold one.
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
		} else if (!(relation.target instanceof Entity && relation.target.root)) {
			diagnostics.push({
				severity: "error",
				rule: "cross-aggregate-reference",
				message: `"${relation.source.name}" references "${relation.target.name}", which is not the root of aggregate "${target.name}"; reference other aggregates by their root's identity`,
				ref: relation.source.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * A relation never crosses a bounded context. Crossing a boundary is an
 * integration, so the source holds the other root's identity as an attribute
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
 * An aggregate's root entity is identified by something. Without an identity
 * attribute nothing says which instance a reference points at.
 */
const rootIdentity: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of aggregatesOf(workspace)) {
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
 */
const entityIdentity: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of aggregatesOf(workspace)) {
		for (const entity of aggregate.entities.values()) {
			if (entity.root) continue;
			const identified = Array.from(entity.attributes.values()).some(
				(a) => a.identity,
			);
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
 * own and owns no lifecycle: no identity attribute, and no `includes`.
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
				if (relation.relation !== "includes") continue;
				diagnostics.push({
					severity: "error",
					rule: "value-object-shape",
					message: `Value object "${vo.name}" includes "${relation.target.name}"; only an entity owns the lifecycle of what it includes, so "${vo.name}" uses "${relation.target.name}" instead`,
					ref: vo.ref,
				});
			}
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
 * `uses` points at value objects (decision 10's conventions), and the parts of
 * one instance form a tree hanging off the root.
 *
 * The claim is about instances, not about types, which is why the rule reads
 * the type graph only for what a type graph can say. A Category whose parts are
 * Categories is the composite pattern, and the instances still form a tree; a
 * Waypoint included by both a FreightLeg and an AccessorialLeg still belongs to
 * one leg at a time. Neither is reported. A ring through two or more distinct
 * types is: there is then no type a reader can name as the one that holds the
 * other, so no instance tree can be laid out either. Relations that leave the
 * aggregate belong to `cross-aggregate-reference`.
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
		const children = new Map<Entity, Entity[]>();
		for (const entity of aggregate.entities.values()) {
			for (const relation of entity.relations) {
				if (relation.relation !== "includes") continue;
				if (!(relation.target instanceof Entity)) continue;
				if (relation.target.aggregate !== aggregate) continue;
				// A type that includes itself nests its own instances, so the edge
				// says nothing about whether the instances form a ring.
				if (relation.target === entity) continue;
				append(children, entity, relation.target);
			}
		}
		diagnostics.push(...includesCycles(aggregate, children));
		diagnostics.push(...orphanEntities(aggregate));
	}
	return diagnostics;
};

/**
 * One diagnostic per entity that no chain of `includes` or `references`
 * reaches from a root of the aggregate. An aggregate with no root at all is
 * `aggregate-root`'s business, so this says nothing about it.
 */
function orphanEntities(aggregate: Aggregate): Diagnostic[] {
	const roots = Array.from(aggregate.entities.values()).filter((e) => e.root);
	if (roots.length === 0) return [];
	const reached = new Set<Entity>();
	const walk = (entity: Entity) => {
		if (reached.has(entity)) return;
		reached.add(entity);
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
 * One diagnostic per back edge of an aggregate's `includes` graph between
 * distinct entity types; a type that includes itself never reaches this graph.
 */
function includesCycles(
	aggregate: Aggregate,
	children: Map<Entity, Entity[]>,
): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	const onStack = new Set<Entity>();
	const walked = new Set<Entity>();
	const walk = (entity: Entity) => {
		onStack.add(entity);
		for (const child of children.get(entity) ?? []) {
			if (onStack.has(child)) {
				diagnostics.push({
					severity: "error",
					rule: "aggregate-tree",
					message: `"${entity.name}" includes "${child.name}", which already includes "${entity.name}" further up aggregate "${aggregate.name}"; with each holding the other there is no whole to start the instance tree from`,
					ref: entity.ref,
				});
				continue;
			}
			if (!walked.has(child)) walk(child);
		}
		onStack.delete(entity);
		walked.add(entity);
	};
	for (const entity of aggregate.entities.values()) {
		if (!walked.has(entity)) walk(entity);
	}
	return diagnostics;
}

/**
 * An attribute typed by a value object and a `uses` relation to it are two
 * halves of the same statement, and a list-typed attribute is a `*` or `1..*`
 * relation.
 *
 * The attribute's `type` is free text by decision 15, so the validator does
 * not parse it and never asks it to spell the value object's name. The one
 * exception is the trailing `[]`, the convention the cardinality check reads
 * as "many".
 */
const attributeRelationCoherence: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const member of modelMembersOf(workspace)) {
		const context = member.boundedcontext;
		const uses = member.relations.filter(
			(r) => r.relation === "uses" && r.target.boundedcontext === context,
		);
		for (const attribute of member.attributes.values()) {
			const vo = attribute.valueobject;
			// A relation may not leave the context, so only ask for one that
			// could exist: a value object reached over a shared kernel is typed
			// by ref alone.
			if (!vo || vo.boundedcontext !== context) continue;
			const relation = uses.find((r) => r.target === vo);
			if (!relation) {
				diagnostics.push({
					severity: "warning",
					rule: "attribute-relation-coherence",
					message: `"${member.name}" types attribute "${attribute.name}" by value object "${vo.name}" but declares no "uses" relation to "${vo.name}", so the relation map never draws it`,
					ref: member.ref,
				});
				continue;
			}
			const type = attribute.type.trim();
			const single =
				relation.cardinality === "1" || relation.cardinality === "0..1";
			if (type.endsWith("[]") && single) {
				diagnostics.push({
					severity: "warning",
					rule: "attribute-relation-coherence",
					message: `"${member.name}" types attribute "${attribute.name}" as a list ("${attribute.type}") but its "uses" relation to "${vo.name}" has cardinality "${relation.cardinality}"`,
					ref: member.ref,
				});
			}
		}
		for (const relation of uses) {
			const typed = Array.from(member.attributes.values()).some(
				(a) => a.valueobject === relation.target,
			);
			if (typed) continue;
			diagnostics.push({
				severity: "warning",
				rule: "attribute-relation-coherence",
				message: `"${member.name}" uses "${relation.target.name}" but no attribute of "${member.name}" is typed by "${relation.target.name}", so the page says the relation exists and never shows where`,
				ref: member.ref,
			});
		}
	}
	return diagnostics;
};

/**
 * An attribute names one shape or none: the value object that models it, or
 * the schema it nests, never both (decision 18). The two are different claims
 * — a value object is a concept of the context's own model, a schema a payload
 * it publishes — and an attribute making both leaves a reader unable to say
 * which of the two the field really is.
 */
const attributeOneShape: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const { owner } of attributeOwnersOf(workspace)) {
		for (const attribute of owner.attributes.values()) {
			if (!attribute.valueobject || !attribute.schema) continue;
			diagnostics.push({
				severity: "error",
				rule: "attribute-one-shape",
				message: `"${owner.name}" types attribute "${attribute.name}" by both value object "${attribute.valueobject.name}" and schema "${attribute.schema.name}"; an attribute has one shape`,
				ref: attribute.ref,
			});
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
 * An invariant is enforced when its aggregate is saved, so everything it
 * constrains has to be inside that aggregate — or be a value object of the
 * aggregate's own context, which is saved as part of whichever aggregate holds
 * one (decision 16). An operation of the same aggregate is inside it too: a
 * transition rule is a rule about what that operation may do, and naming it is
 * how the model says which change the rule guards (decision 19).
 */
const invariantInAggregate: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of aggregatesOf(workspace)) {
		for (const invariant of aggregate.invariants.values()) {
			for (const target of invariant.targets) {
				const scope = scopeOf(target);
				if (scope === aggregate || scope === aggregate.boundedcontext) continue;
				const where = scope
					? `${scope instanceof Aggregate ? "aggregate" : "bounded context"} "${scope.name}"`
					: "no aggregate at all";
				diagnostics.push({
					severity: "error",
					rule: "invariant-in-aggregate",
					message: `Invariant "${invariant.name}" of aggregate "${aggregate.name}" constrains "${constrainableLabel(target)}", which is in ${where}; an invariant holds inside the boundary that is saved as one`,
					ref: invariant.ref,
				});
			}
		}
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
				ref: consumption.consumer.ref,
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
			diagnostics.push({
				severity: "warning",
				rule: "relationship-roles-backed",
				message: `"${downstream.name}" is declared ${role} to "${upstream.name}", but no consumption of "${downstream.name}" from "${upstream.name}" declares that downstream role`,
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
 * The directed relationships whose traffic is calls form no cycle.
 *
 * Upstream and downstream is a statement about models: the downstream context
 * shapes its own model around what the upstream offers. A ring of those means
 * every context on it is shaped around a model that is shaped around its own,
 * so none of them can settle or change first. Only a call counts as a step
 * (decision 20): a step carried only by events, or by a policy subscribing to
 * the other side's event, is choreography, and rings of those are
 * `reaction-cycle`'s business. That makes the common shape honest: two
 * contexts, each upstream in one respect and downstream in another, are a ring
 * only when both directions are calls.
 */
const relationshipCycle: Rule = (workspace) => {
	// The contexts are the nodes, so every ring found is a ring of distinct
	// contexts. Walking the relationships instead would also report the longer
	// closed walks that thread the same context twice, which say nothing new.
	const startingAt = new Map<BoundedContext, ContextRelationship[]>();
	for (const relationship of workspace.relationships) {
		if (!isDirectedRelationshipType(relationship.type)) continue;
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
					)}; each of these contexts shapes its model around the next, so every model on the ring is shaped around one that is shaped around itself and none can change first. Declare a partnership where two of them really do move as one, or reverse a dependency by turning that call into an event the other side reacts to`,
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
 */
const sharedKernelBacked: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const relationship of workspace.relationships) {
		if (relationship.type !== "shared-kernel") continue;
		const { source, target } = relationship;
		if (borrowsFrom(source, target) || borrowsFrom(target, source)) continue;
		diagnostics.push({
			severity: "warning",
			rule: "shared-kernel-backed",
			message: `"${source.name}" and "${target.name}" declare a shared kernel, but neither types an attribute by a value object the other declares or carries one of its schemas, so nothing is in the kernel`,
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
	// A policy subscribing to another context's event is the same exchange as
	// a consumption, so it backs the partnership just as well.
	for (const policy of to.policies.values()) {
		for (const event of policy.events) {
			if (event.provider.boundedcontext === from) return true;
		}
	}
	return false;
}

/**
 * A partnership is a two-way dependency: the two contexts succeed or fail
 * together, which is only true when each actually depends on the other. One
 * with no traffic at all is a wish, and one with traffic only one way is a
 * directed relationship wearing a partner's badge, which quietly excuses both
 * ends from declaring the upstream and downstream roles they really have.
 */
const partnershipBacked: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const relationship of workspace.relationships) {
		if (relationship.type !== "partnership") continue;
		const { source, target } = relationship;
		const missing = (
			[
				[source, target],
				[target, source],
			] as const
		).filter(([from, to]) => !trafficCrosses(workspace, from, to));
		if (missing.length === 0) continue;
		const gaps = missing
			.map(([from, to]) => `"${to.name}" consumes nothing from "${from.name}"`)
			.join(" and ");
		diagnostics.push({
			severity: "warning",
			rule: "partnership-backed",
			message: `"${source.name}" and "${target.name}" are declared partners, but ${gaps}; a partnership is a two-way dependency, so back it with consumables both ways or state the direction the dependency really runs`,
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
			ref: consumption.consumer.ref,
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
	// A policy subscribing to another context's event is the same exchange as
	// a consumption, so separate ways rules it out too.
	for (const bc of workspace.boundedcontexts.values()) {
		for (const policy of bc.policies.values()) {
			for (const event of policy.events) {
				const providerContext = event.provider.boundedcontext;
				if (providerContext === bc) continue;
				const declaredApart = separateWaysRelationships.some(
					(r) => r.involves(providerContext) && r.involves(bc),
				);
				if (!declaredApart) continue;
				diagnostics.push({
					severity: "error",
					rule: "separate-ways",
					message: `Policy "${policy.name}" in "${bc.name}" reacts to "${event.name}" from "${providerContext.name}" although the contexts declare separate ways`,
					ref: policy.ref,
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
		for (const policy of bc.policies.values()) {
			for (const event of policy.events) {
				if (event.internal && event.provider.boundedcontext !== bc) {
					diagnostics.push({
						severity: "error",
						rule: "internal-consumable",
						message: `Policy "${policy.name}" reacts to "${event.name}", which is internal to "${event.provider.boundedcontext.name}"`,
						ref: policy.ref,
					});
				}
			}
			for (const command of policy.commands) {
				if (command.internal && command.provider.boundedcontext !== bc) {
					diagnostics.push({
						severity: "error",
						rule: "internal-consumable",
						message: `Policy "${policy.name}" issues "${command.name}", which is internal to "${command.provider.boundedcontext.name}"`,
						ref: policy.ref,
					});
				}
			}
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
	for (const bc of workspace.boundedcontexts.values()) {
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
	Array.from(workspace.boundedcontexts.values()).flatMap((bc) =>
		Array.from(bc.aggregates.values()).flatMap((aggregate) =>
			operationsStayInside("aggregate-not-public", "Aggregate", aggregate),
		),
	);

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
 * A payload shape is its own context's, wherever it is named: on a consumable
 * that sends or answers with it, and on an attribute that nests it (decision
 * 18). The exception is a context this one shares a kernel with: that
 * relationship is the declaration that the two keep part of one model between
 * them, and it is the only place a payload may be borrowed (decision 16).
 */
const schemaContext: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	/** Whether the schema is another context's and no kernel is shared with it. */
	const borrowedBy = (schema: DataSchema, bc: BoundedContext) =>
		schema.boundedcontext !== bc &&
		!sharesKernelWith(workspace, bc, schema.boundedcontext);
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

/** Policies react to events and issue operations; operations raise events. */
const consumableKinds: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		for (const policy of bc.policies.values()) {
			for (const c of policy.events.filter((c) => c.type !== "event")) {
				diagnostics.push({
					severity: "error",
					rule: "consumable-kind",
					message: `Policy "${policy.name}" reacts to "${c.name}", which is an operation, not an event`,
					ref: policy.ref,
				});
			}
			for (const c of policy.commands.filter((c) => c.type !== "operation")) {
				diagnostics.push({
					severity: "error",
					rule: "consumable-kind",
					message: `Policy "${policy.name}" issues "${c.name}", which is an event, not an operation`,
					ref: policy.ref,
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

/** A policy reacts to something and does something. */
const policyComplete: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	const policies: Policy[] = Array.from(
		workspace.boundedcontexts.values(),
	).flatMap((bc) => Array.from(bc.policies.values()));
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

/** A step in the reaction chain: an operation, an event, or a policy. */
type Reactor = Consumable | Policy;

/**
 * What the reaction chain does next: an operation leads to the events it
 * raises, an event to the policies listening for it, and a policy to the
 * operations it issues.
 */
function reactionsFrom(
	node: Reactor,
	listeners: Map<Consumable, Policy[]>,
): Reactor[] {
	if (node instanceof Policy) return node.commands;
	return [...node.raisedEvents, ...(listeners.get(node) ?? [])];
}

/**
 * The reactions form no cycle: no operation raises an event whose policy
 * issues an operation that leads, however far around, back to the first.
 *
 * A ring like that runs forever unless something outside the model stops it,
 * and nothing in the model says what — so it is the modeller who has to look
 * and either break the ring or write down the condition that ends it.
 */
const reactionCycle: Rule = (workspace) => {
	const listeners = new Map<Consumable, Policy[]>();
	const nodes: Reactor[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		for (const provider of [...bc.aggregates.values(), ...bc.services.values()])
			nodes.push(...provider.consumables.values());
		for (const policy of bc.policies.values()) {
			nodes.push(policy);
			for (const event of policy.events) append(listeners, event, policy);
		}
	}

	return cyclesOf(
		nodes,
		(node) => reactionsFrom(node, listeners),
		(node) => node.ref,
	).map((cycle) => ({
		severity: "warning" as const,
		rule: "reaction-cycle",
		message: `Reactions run in a cycle: ${[...cycle, cycle[0]]
			.map((n) => `"${n.name}"`)
			.join(
				" -> ",
			)}; the chain triggers itself and nothing in the model says what ends it`,
		ref: cycle[0].ref,
	}));
};

/** Every context serves at least one subdomain. */
const contextServesSubdomain: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
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
	return `"${intent.name}", provided by "${intent.provider.name}"`;
}

/**
 * Where a diagnostic about an intent points. A consumption is the one intent
 * with no ref of its own, so it reports at its consumer, as `role-coherence`
 * and `mud-needs-acl` already do.
 */
function intentRef(intent: StrategicIntent): string {
	return intent instanceof Consumption ? intent.consumer.ref : intent.ref;
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
			ref: intentRef(intent),
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
		summary: "Every aggregate has exactly one root entity.",
		why: "The root is the one thing you name the cluster after and reach it through; without it nobody knows where the rules are enforced, and with two the boundary is really two aggregates.",
		fix: "Mark the entity the aggregate is named after with root: true, or split the aggregate if two entities genuinely lead their own clusters.",
		check: aggregateRoot,
	},
	{
		rule: "cross-aggregate-reference",
		severities: ["error"],
		summary:
			"A relation into another aggregate uses references and targets that aggregate's root; a relation to a value object crosses nothing.",
		why: "Aggregates are consistency boundaries; reaching inside another one couples the two so they can no longer change or be stored independently. A value object belongs to the whole context rather than to one aggregate, so using one is not reaching into anybody.",
		fix: 'Change the relation to "references" and point it at the other aggregate\'s root entity, holding only its identity.',
		check: crossAggregateReference,
	},
	{
		rule: "cross-context-relation",
		severities: ["error"],
		summary:
			"A relation never crosses a bounded context; only an identity does.",
		why: "Each context is its own model with its own language and lifecycle (decision 03), so a relation across the boundary makes one context's entity part of the other's object graph and the two can no longer be loaded, changed or stored apart. Decision 08's crossing table already says an entity relation's target may not cross a file, and splitting the contexts into their own files is exactly what turns this relation into a load error.",
		fix: "Delete the relation and give the source an attribute holding the other root's identity — an Order in Sales carries petId rather than a relation to Catalog's Pet. The dependency between the two contexts then reads where it belongs, on the consumable map: the consumable the source consumes and the context relationship between the two.",
		check: crossContextRelation,
	},
	{
		rule: "root-identity",
		severities: ["error"],
		summary:
			"An aggregate's root entity declares at least one identity attribute.",
		why: "An entity is the thing that stays itself while its values change, and the root is what the rest of the model reaches the aggregate by. With no identity on it, nothing can say which one of them a reference, an event payload or a stored row is about.",
		fix: "Mark the attribute the business uses to tell one apart — the order number, the customer id — with identity: true, or make the element a value object if there really is nothing to identify.",
		check: rootIdentity,
	},
	{
		rule: "entity-identity",
		severities: ["warning"],
		summary:
			"Every non-root entity in an aggregate declares at least one identity attribute.",
		why: "An entity is precisely the thing you can still tell apart from another one holding exactly the same values. Without an identity attribute nothing does the telling apart, so the element is a value object that has been filed under the wrong heading, and readers will expect a lifecycle and a history it does not have.",
		fix: "Give the entity the attribute the business identifies it by — the line number, the reference — with identity: true, or make it a value object, which is usually what an entity with nothing to identify really was.",
		check: entityIdentity,
	},
	{
		rule: "value-object-shape",
		severities: ["error"],
		summary:
			"A value object declares no identity attribute and includes nothing.",
		why: "Two value objects with the same values are the same value: that is what makes them safe to copy, compare and replace. An identity attribute contradicts that, and includes claims a lifecycle a value object does not own.",
		fix: "Drop identity: true from the attribute, or promote the element to an entity if it really has a life of its own; change an includes on a value object to uses.",
		check: valueObjectShape,
	},
	{
		rule: "aggregate-tree",
		severities: ["error", "warning"],
		summary:
			"Inside an aggregate, includes points at entities and uses at value objects, no ring of two or more entity types includes itself, and every entity is reachable from the root.",
		why: "The aggregate is loaded and saved as one thing through its root, so the parts of one instance hang off it as a tree. That is a claim about instances, not about types: an entity whose parts are of its own type is the composite pattern and still a tree per instance, and a part type included by two different wholes still belongs to one of them at a time, so neither is reported. A ring through two or more distinct types is, because then no type can be named as the one that holds the other and there is no whole to start from. An includes onto a value object or a uses onto an entity says the opposite of what the author means, and an entity nothing reaches is either dead or a missing relation.",
		fix: "Point includes at entities and uses at value objects, break a ring of distinct types by making the back edge a references, and give an unreachable entity the relation that reaches it — or move it to its own aggregate.",
		check: aggregateTree,
	},
	{
		rule: "attribute-relation-coherence",
		severities: ["warning"],
		summary:
			"An attribute typed by a value object has a matching uses relation, of a matching cardinality.",
		why: "The attribute list and the relation map are two views of the same statement. When one has what the other lacks, a reader gets a different model depending on which page they opened, and a list-typed attribute against a single-valued relation says two different things about how many there are.",
		fix: "Add the missing uses relation or the missing attribute, and set the relation's cardinality to * or 1..* for a list-typed attribute. The type itself is free text and is never checked against the value object's name; only a trailing [] is read, as \"many\".",
		check: attributeRelationCoherence,
	},
	{
		rule: "attribute-one-shape",
		severities: ["error"],
		summary:
			"An attribute is typed by a value object or by a schema, never by both.",
		why: "A value object and a schema are two different things to be. A value object is a concept the context models and compares by value; a schema is a payload shape the context publishes to whoever is listening. An attribute claiming both leaves a reader unable to say which model the field belongs to, and a change to either shape becomes a change nobody can scope.",
		fix: "Keep the value object when the attribute is a concept of the domain, and the schema when it is a nested part of a payload; drop the other. Collections stay in the type string, so a list of a nested shape is OrderLine[] beside one schema reference.",
		check: attributeOneShape,
	},
	{
		rule: "invariant-in-aggregate",
		severities: ["error"],
		summary:
			"Every element an invariant constrains belongs to the invariant's own aggregate — an entity, an attribute, one of its operations — or is a value object of its context.",
		why: "An invariant is the rule that holds every time its aggregate is saved. Something outside the boundary can change between one save and the next with nothing to stop it, so a rule stretched across two aggregates is a rule nobody can enforce. A value object is one exception: it belongs to the context and carries no state of its own, so it is saved as part of whichever aggregate holds one. The aggregate's own operations are the other: a rule about a transition is a rule about the operation that makes it, and naming it says which change the rule guards.",
		fix: "Move the invariant to the aggregate that owns what it constrains, drop the foreign target, or model the guarantee as a policy reacting to the other aggregate's event, which is eventual by nature. If the target is an application service's operation, name the aggregate's own operation behind it instead: that is where the rule is enforced.",
		check: invariantInAggregate,
	},
	{
		rule: "relationship-roles-backed",
		severities: ["warning"],
		summary:
			"A directed relationship's declared roles are carried by consumables and consumptions crossing between the two contexts, and a crossing consumption's role is declared on the relationship.",
		why: "The context map and the consumable map are the same integration told twice, strategically and concretely. A role on the map that nothing carries is a claim about a team's way of working with nothing behind it, and a consumption whose role the map never mentions is an integration decision made without the map noticing.",
		fix: "Set the matching pattern on the consumable the downstream context consumes, or on the consumption, or take the role off the relationship if the integration is not really like that. A published-language role is backed by any crossing consumable carrying a schema, since a published language is a data shape rather than a second flag.",
		check: relationshipRolesBacked,
	},
	{
		rule: "relationship-cycle",
		severities: ["warning"],
		summary:
			"The directed relationships whose traffic is calls form no cycle; steps carried only by events do not count.",
		why: "Downstream means a context shapes its model around what the upstream offers. In a ring of calls every context is shaped around a model that is shaped around its own, so none of them can settle or change first and the coupling has no end to start from. Events are different: reacting to a fact commits nobody to another model's shape, so a ring of contexts joined by events is fine, and rings of reactions are reaction-cycle's business instead.",
		fix: "Declare a partnership where two of the contexts really do move as one, which says the mutual shaping is deliberate; otherwise reverse one dependency by turning that call into an event the other side reacts to, which is what DDD recommends anyway.",
		check: relationshipCycle,
	},
	{
		rule: "partnership-backed",
		severities: ["warning"],
		summary:
			"Two contexts declaring a partnership exchange consumables — or events a policy reacts to — in both directions.",
		why: "A partnership says two teams succeed or fail together and so plan their releases as one, which is only worth the coordination when each really depends on the other. A partnership with no traffic at all is a wish, and one with traffic only one way is a directed relationship wearing a partner's badge — which quietly excuses both ends from declaring the upstream and downstream roles they actually have.",
		fix: "Add the consumable the other direction is missing, or replace the partnership with the upstream-downstream or customer-supplier relationship the traffic really describes.",
		check: partnershipBacked,
	},
	{
		rule: "shared-kernel-backed",
		severities: ["warning"],
		summary:
			"Two contexts declaring a shared kernel share at least one value object or schema across it.",
		why: "A shared kernel is a piece of model two teams agree to keep in step, and it costs them the freedom to change it alone. Declaring one with nothing in it pays that price for nothing, and it stands in the model as the warrant for a sharing nobody has made: it is the one relationship over which a value object or a payload schema may be borrowed.",
		fix: "Type an attribute by a value object the other context declares, nest one of its schemas in an attribute, or carry one on a consumable; or replace the shared kernel with the relationship the two contexts really have.",
		check: sharedKernelBacked,
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
		rule: "domain-service-internal",
		severities: ["error"],
		summary:
			"A domain service's operations declare no upstream role and are consumed only inside their own context.",
		why: "A domain service holds domain logic that belongs to no single aggregate — it is the inside of the model, the same as an aggregate. Offering it outward makes another context depend on how this one arranges its logic instead of on what it promises.",
		fix: "Mark the domain service's operation internal: true and drop its pattern, then let the context's application service provide the public operation that consumes it.",
		check: domainServiceInternal,
	},
	{
		rule: "schema-context",
		severities: ["error"],
		summary:
			"A schema named by a consumable's payload, by its returns or by a nested attribute belongs to the naming element's own context, or to one it shares a kernel with.",
		why: "The context that publishes a message owns its shape; borrowing another context's schema ties the two together so neither can change it alone. A nested schema is the same borrowing one level down. A shared kernel is where two teams have said that in the model and accepted the price, so it is the one place the borrowing is allowed.",
		fix: "Move or copy the schema into the publishing context and point the consumable or attribute at that one, or declare the shared kernel if the two contexts really do keep that shape between them.",
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
		rule: "consumable-kind",
		severities: ["error"],
		summary:
			"Policies react to events and issue operations; only operations raise events, and they raise only events.",
		why: "An event is a fact that happened, an operation is a request to do something; mixing them up makes flows unreadable.",
		fix: "Check the type of each consumable a policy or raises list points at and swap it for the right kind.",
		check: consumableKinds,
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
			"The reactions form no cycle: no operation raises an event whose policy issues an operation that leads back to the first.",
		why: "A ring of reactions runs forever unless something outside the model stops it, and nothing in the model says what that something is. Whoever reads the model next cannot tell whether the loop is a bug or a legitimate retry with a condition that was never written down.",
		fix: "Break the ring — usually one of the policies is reacting to too broad an event, or issues an operation it should not — or, if the loop is real and ends on a condition, model that condition so the chain stops somewhere a reader can see.",
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
		fix: "Add a comment to the relationship, consumable or consumption saying what the trouble is and what clearing it would take, or set the disposition back to by-design if the intent is how it should be after all.",
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
