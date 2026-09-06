import {
	type Attribute,
	type AttributeOwner,
	BoundedContext,
	DataSchema,
	type IdentityTarget,
} from "./workspace";

/** Everything one context declares that carries attributes. */
export function* attributeOwnersIn(
	context: BoundedContext,
): Iterable<AttributeOwner> {
	yield* context.schemas.values();
	yield* context.valueobjects.values();
	for (const aggregate of context.aggregates.values())
		yield* aggregate.entities.values();
}

/**
 * The part of one context's model that holds instances: its value objects and
 * the entities inside its aggregates, and not its payload schemas.
 *
 * An identity an entity or a value object holds is this context's dependency on
 * another's identity scheme: something here is stored knowing what it points at,
 * and it stays true until somebody edits the model. An identity in a schema is
 * a correlation id echoed in a payload — an event carrying the order it is
 * about, a request carrying the customer — which the payload carries for its
 * reader, so the context publishing the schema owes the other nothing and has
 * no dependency to declare (decision 14, second amendment; card 90).
 */
function* modelOwnersIn(context: BoundedContext): Iterable<AttributeOwner> {
	yield* context.valueobjects.values();
	for (const aggregate of context.aggregates.values())
		yield* aggregate.entities.values();
}

/**
 * An identity attribute of an entity or a value object in one context naming an
 * entity of another, or a context the model does not state the insides of.
 * Decision 14 made this the only way a model records a dependency on another
 * context's model, so it is a crossing in its own right: it draws on the
 * context map under «id» even when nothing is consumed, and that edge is its
 * record. No relationship is asked for on top of it — one relationship per
 * identity, with no roles either side because nothing is exchanged, is a shape
 * DDD does not have (decision 14's amendment of 2026-09-09) — but the rules
 * that have something to say about it still read it: `separate-ways`, because
 * two contexts that declared they do not integrate have no identities of each
 * other's to hold, and `mud-needs-acl`, because a key from a system nobody can
 * read is its model in yours. A payload schema's identity is left out; see
 * {@link modelOwnersIn}.
 */
export type IdentityCrossing = {
	/** The identity attribute that names the other context. */
	attribute: Attribute;
	/**
	 * What it identifies: the other context's entity; a schema an external
	 * context publishes for the kind the id names; or that context itself when
	 * it is external or a big ball of mud and the id belongs to a system whose
	 * entities are not ours to state or not anyone's to find (decision 28).
	 */
	target: IdentityTarget;
	/** The context holding the identity, and so depending on the other. */
	from: BoundedContext;
	/** The context the identity reaches: the one that owns what it names. */
	to: BoundedContext;
};

/** The context an identity attribute's target belongs to. */
export function contextIdentified(target: IdentityTarget): BoundedContext {
	return target instanceof BoundedContext ? target : target.boundedcontext;
}

/**
 * What a crossing identity names, in words a diagnostic can drop into a
 * sentence: the other context's entity; the kind an external context publishes
 * a schema for; or — where that system's entities are not ours to state and it
 * publishes nothing for this id — an id of the system itself (decision 28).
 */
export function identityNamed(crossing: IdentityCrossing): string {
	const { target, to } = crossing;
	if (target instanceof BoundedContext) return `an id belonging to "${to.name}"`;
	if (target instanceof DataSchema)
		return `the identity of a "${target.name}" in "${to.name}"`;
	return `the identity of "${target.name}" in "${to.name}"`;
}

/**
 * Every identity an entity or a value object holds that reaches out of its own
 * context, among the contexts given. Both ends must be in the list, as a
 * consumption needs both ends in scope before the context map draws it.
 */
export function* identityCrossings(
	contexts: BoundedContext[],
): Iterable<IdentityCrossing> {
	const inScope = new Set(contexts);
	for (const from of contexts) {
		for (const owner of modelOwnersIn(from)) {
			for (const attribute of owner.attributes.values()) {
				const target = attribute.identifies;
				if (!target) continue;
				const to = contextIdentified(target);
				if (to === from || !inScope.has(to)) continue;
				yield { attribute, target, from, to };
			}
		}
	}
}
