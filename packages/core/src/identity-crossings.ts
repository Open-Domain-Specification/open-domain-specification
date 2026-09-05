import {
	type Attribute,
	type AttributeOwner,
	BoundedContext,
	type Entity,
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
 * An identity attribute in one context naming an entity of another, or an
 * external context itself. Decision 14 made this the only way a model records
 * a dependency on another context's model, so it is a crossing in its own
 * right: it wants a declared relationship (`relationship-declared`) and it
 * draws on the context map even when nothing is consumed.
 */
export type IdentityCrossing = {
	/** The identity attribute that names the other context. */
	attribute: Attribute;
	/**
	 * What it identifies: the other context's entity, or that context itself
	 * when the id belongs to a system whose entities are not ours to state
	 * (decision 28).
	 */
	target: Entity | BoundedContext;
	/** The context holding the identity, and so depending on the other. */
	from: BoundedContext;
	/** The context the identity reaches: the one that owns what it names. */
	to: BoundedContext;
};

/** The context an identity attribute's target belongs to. */
export function contextIdentified(
	target: Entity | BoundedContext,
): BoundedContext {
	return target instanceof BoundedContext ? target : target.boundedcontext;
}

/**
 * Every identity that reaches out of its own context, among the contexts
 * given. Both ends must be in the list, as a consumption needs both ends in
 * scope before the context map draws it.
 */
export function* identityCrossings(
	contexts: BoundedContext[],
): Iterable<IdentityCrossing> {
	const inScope = new Set(contexts);
	for (const from of contexts) {
		for (const owner of attributeOwnersIn(from)) {
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
