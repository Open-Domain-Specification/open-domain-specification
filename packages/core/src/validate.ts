import { relationshipsWithoutComments } from "./evidence";
import {
	type Aggregate,
	Attribute,
	type BoundedContext,
	type Constrainable,
	type Consumption,
	constrainableLabel,
	Entity,
	type EntityRelation,
	isDirectedRelationshipType,
	type Policy,
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

function* relationsOf(workspace: Workspace): Iterable<EntityRelation> {
	for (const aggregate of aggregatesOf(workspace)) {
		for (const entity of aggregate.entities.values()) yield* entity.relations;
		for (const vo of aggregate.valueobjects.values()) yield* vo.relations;
	}
}

function* membersOf(aggregate: Aggregate): Iterable<Entity | ValueObject> {
	yield* aggregate.entities.values();
	yield* aggregate.valueobjects.values();
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
 * and may not include or use its members directly.
 */
const crossAggregateReference: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const relation of relationsOf(workspace)) {
		if (relation.source.aggregate === relation.target.aggregate) continue;
		const target = relation.target;
		if (relation.relation !== "references") {
			diagnostics.push({
				severity: "error",
				rule: "cross-aggregate-reference",
				message: `"${relation.source.name}" ${relation.relation} "${target.name}" in another aggregate; across aggregates only "references" is allowed`,
				ref: relation.source.ref,
			});
		} else if (!(target instanceof Entity && target.root)) {
			diagnostics.push({
				severity: "error",
				rule: "cross-aggregate-reference",
				message: `"${relation.source.name}" references "${target.name}", which is not the root of aggregate "${target.aggregate.name}"; reference other aggregates by their root's identity`,
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
		const source = relation.source.aggregate.boundedcontext;
		const target = relation.target.aggregate.boundedcontext;
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
 * A value object is compared by its values, so it carries no identity of its
 * own and owns no lifecycle: no identity attribute, and no `includes`.
 */
const valueObjectShape: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of aggregatesOf(workspace)) {
		for (const vo of aggregate.valueobjects.values()) {
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

/**
 * Within one aggregate `includes` forms a tree from the root: it points at
 * entities, no entity has two parents, and no chain closes on itself, while
 * `uses` points at value objects (decision 10's conventions). Relations that
 * leave the aggregate belong to `cross-aggregate-reference`.
 */
const aggregateTree: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of aggregatesOf(workspace)) {
		const parents = new Map<Entity, Entity[]>();
		const children = new Map<Entity, Entity[]>();
		for (const member of membersOf(aggregate)) {
			for (const relation of member.relations) {
				if (relation.target.aggregate !== aggregate) continue;
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
				if (relation.relation !== "includes") continue;
				// A value object that includes anything is value-object-shape's.
				if (!(member instanceof Entity)) continue;
				if (!(relation.target instanceof Entity)) {
					diagnostics.push({
						severity: "error",
						rule: "aggregate-tree",
						message: `"${member.name}" includes "${relation.target.name}", which is a value object; "includes" points at an entity, and a value object is used`,
						ref: member.ref,
					});
					continue;
				}
				append(parents, relation.target, member);
				append(children, member, relation.target);
			}
		}
		for (const [child, owners] of parents) {
			if (owners.length < 2) continue;
			const named = owners.map((o) => `"${o.name}"`).join(" and ");
			diagnostics.push({
				severity: "error",
				rule: "aggregate-tree",
				message: `"${child.name}" is included by ${named} in aggregate "${aggregate.name}"; inside an aggregate an entity has exactly one parent`,
				ref: child.ref,
			});
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
			if (relation.target.aggregate !== aggregate) continue;
			if (relation.target instanceof Entity) walk(relation.target);
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

/** One diagnostic per back edge of an aggregate's `includes` graph. */
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
					message: `"${entity.name}" includes "${child.name}", which already includes "${entity.name}" further up aggregate "${aggregate.name}"; "includes" forms a tree from the root, never a cycle`,
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
 */
const attributeRelationCoherence: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of aggregatesOf(workspace)) {
		for (const member of membersOf(aggregate)) {
			const uses = member.relations.filter(
				(r) => r.relation === "uses" && r.target.aggregate === aggregate,
			);
			for (const attribute of member.attributes.values()) {
				const vo = attribute.valueobject;
				// A `uses` may not leave the aggregate, so only ask for one that could exist.
				if (!vo || vo.aggregate !== aggregate) continue;
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
				if (type !== vo.name && type !== `${vo.name}[]`) {
					diagnostics.push({
						severity: "warning",
						rule: "attribute-relation-coherence",
						message: `"${member.name}" types attribute "${attribute.name}" as "${attribute.type}" but points it at value object "${vo.name}"; the type a reader sees should be "${vo.name}" or "${vo.name}[]"`,
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
	}
	return diagnostics;
};

/** The aggregate a constrainable element sits in, if it sits in one at all. */
function aggregateOf(target: Constrainable): Aggregate | undefined {
	if (target instanceof Attribute) {
		const { owner } = target;
		return owner instanceof Entity || owner instanceof ValueObject
			? owner.aggregate
			: undefined;
	}
	return target.aggregate;
}

/**
 * An invariant is enforced when its aggregate is saved, so everything it
 * constrains has to be inside that aggregate.
 */
const invariantInAggregate: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of aggregatesOf(workspace)) {
		for (const invariant of aggregate.invariants.values()) {
			for (const target of invariant.targets) {
				const owner = aggregateOf(target);
				if (owner === aggregate) continue;
				const where = owner
					? `aggregate "${owner.name}"`
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

/**
 * The roles a directed relationship claims are the roles its traffic actually
 * carries, in both directions: every declared role is backed by a crossing,
 * and every crossing consumption's role is declared on the relationship.
 */
const relationshipRolesBacked: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	const consumptions = Array.from(consumptionsOf(workspace));
	for (const relationship of workspace.relationships) {
		if (!isDirectedRelationshipType(relationship.type)) continue;
		const upstream = relationship.source;
		const downstream = relationship.target;
		const crossings = consumptions.filter(
			(c) =>
				c.consumable.provider.boundedcontext === upstream &&
				c.consumer.boundedcontext === downstream,
		);
		for (const role of relationship.upstreamRoles) {
			if (crossings.some((c) => c.consumable.pattern === role)) continue;
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

/** A consumable's payloads, sent and returned, are its own context's schemas. */
const schemaContext: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		for (const p of [...bc.aggregates.values(), ...bc.services.values()]) {
			for (const c of p.consumables.values()) {
				if (c.schema && c.schema.boundedcontext !== bc) {
					diagnostics.push({
						severity: "error",
						rule: "schema-context",
						message: `"${c.name}" carries schema "${c.schema.name}" from "${c.schema.boundedcontext.name}"; a payload belongs to the context that publishes it`,
						ref: c.ref,
					});
				}
				if (c.returns && c.returns.boundedcontext !== bc) {
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
			"A relation into another aggregate uses references and targets that aggregate's root.",
		why: "Aggregates are consistency boundaries; reaching inside another one couples the two so they can no longer change or be stored independently.",
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
			"Inside an aggregate, includes forms a tree from the root over entities, uses points at value objects, and every entity is reachable from the root.",
		why: "The aggregate is loaded and saved as one thing through its root. Two parents or a cycle means there is no single order in which to save it, an includes onto a value object or a uses onto an entity says the opposite of what the author means, and an entity nothing reaches is either dead or a missing relation.",
		fix: "Point includes at the entity's one parent and uses at value objects, break the cycle by making the back edge a references, and give an unreachable entity the relation that reaches it — or move it to its own aggregate.",
		check: aggregateTree,
	},
	{
		rule: "attribute-relation-coherence",
		severities: ["warning"],
		summary:
			"An attribute typed by a value object has a matching uses relation, of a matching cardinality, and says the value object's name as its type.",
		why: "The attribute list and the relation map are two views of the same statement. When one has what the other lacks, a reader gets a different model depending on which page they opened, and a list-typed attribute against a single-valued relation says two different things about how many there are.",
		fix: "Add the missing uses relation or the missing attribute, set the relation's cardinality to * or 1..* for a list, and write the attribute's type as the value object's name (or its name followed by []).",
		check: attributeRelationCoherence,
	},
	{
		rule: "invariant-in-aggregate",
		severities: ["error"],
		summary:
			"Every element an invariant constrains belongs to the invariant's own aggregate.",
		why: "An invariant is the rule that holds every time its aggregate is saved. Something outside the boundary can change between one save and the next with nothing to stop it, so a rule stretched across two aggregates is a rule nobody can enforce.",
		fix: "Move the invariant to the aggregate that owns what it constrains, drop the foreign target, or model the guarantee as a policy reacting to the other aggregate's event, which is eventual by nature.",
		check: invariantInAggregate,
	},
	{
		rule: "relationship-roles-backed",
		severities: ["warning"],
		summary:
			"A directed relationship's declared roles are carried by consumables and consumptions crossing between the two contexts, and a crossing consumption's role is declared on the relationship.",
		why: "The context map and the consumable map are the same integration told twice, strategically and concretely. A role on the map that nothing carries is a claim about a team's way of working with nothing behind it, and a consumption whose role the map never mentions is an integration decision made without the map noticing.",
		fix: "Set the matching pattern on the consumable the downstream context consumes, or on the consumption, or take the role off the relationship if the integration is not really like that.",
		check: relationshipRolesBacked,
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
			"A consumable's payload schema belongs to the consumable's own context.",
		why: "The context that publishes a message owns its shape; borrowing another context's schema ties the two together.",
		fix: "Move or copy the schema into the publishing context and point the consumable at that one.",
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
];

/** The rules `validateWorkspace` applies, described for readers and tooling. */
export const RULE_CATALOG: ReadonlyArray<RuleDescription> = RULES.map(
	({ check: _check, ...description }) => description,
);

/** Checks a workspace against the DDD rules ODS can verify structurally. */
export function validateWorkspace(workspace: Workspace): Diagnostic[] {
	return RULES.flatMap((rule) => rule.check(workspace));
}
