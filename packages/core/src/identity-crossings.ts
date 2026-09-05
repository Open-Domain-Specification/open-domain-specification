import type {
	Attribute,
	AttributeOwner,
	BoundedContext,
	Entity,
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
 * An identity attribute in one context naming an entity of another. Decision 14
 * made this the only way a model records a dependency on another context's
 * model, so it is a crossing in its own right: it wants a declared
 * relationship (`relationship-declared`) and it draws on the context map even
 * when nothing is consumed.
 */
export type IdentityCrossing = {
	/** The identity attribute that names the other context's entity. */
	attribute: Attribute;
	/** The entity it identifies. */
	entity: Entity;
	/** The context holding the identity, and so depending on the other. */
	from: BoundedContext;
	/** The context that owns the entity identified. */
	to: BoundedContext;
};

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
				const entity = attribute.identifies;
				const to = entity?.boundedcontext;
				if (!entity || !to || to === from || !inScope.has(to)) continue;
				yield { attribute, entity, from, to };
			}
		}
	}
}
