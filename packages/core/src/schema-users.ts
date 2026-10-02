import type {
	Aggregate,
	Attribute,
	BoundedContext,
	Consumable,
	DataSchema,
	ValueObject,
} from "./workspace";

/** One place a schema is used, anywhere in the workspace. */
export type SchemaUsage = "shape" | "identity" | "shape and identity";

export type SchemaUser =
	| { kind: "consumable"; boundedcontext: BoundedContext; owner: Consumable }
	| {
			kind: "aggregate";
			boundedcontext: BoundedContext;
			owner: Aggregate;
			use: SchemaUsage;
	  }
	| {
			kind: "value object";
			boundedcontext: BoundedContext;
			owner: ValueObject;
			use: SchemaUsage;
	  }
	| {
			kind: "schema";
			boundedcontext: BoundedContext;
			owner: DataSchema;
			use: SchemaUsage;
	  };

/**
 * Everything in the workspace that depends on a schema, in the order a
 * reader meets it: the contexts as the workspace lists them, and within one
 * its consumables, then its aggregates, value objects and schemas; each user
 * once.
 *
 * A user is a consumable that carries the shape as its payload, its answer or
 * a refusal, or an owner with an attribute that names the schema as a shape
 * or as the kind an identity identifies: an aggregate whose entities hold it,
 * a value object, or another schema that nests it. A value-object kind also
 * holds the attributes it inherits from its parent. A posting line is inside
 * the entry a command posts, so carriers alone would call that shape unused.
 * An identity naming an external kind does not carry the kind's attributes.
 * A schema that only mentions itself has no user, and an attribute that merely
 * spells the schema's name as a type does not count: the link is its `schema`
 * or `identifies` reference.
 */
export function usersOfSchema(schema: DataSchema): SchemaUser[] {
	const users: SchemaUser[] = [];
	const useOf = (attributes: Iterable<Attribute>): SchemaUsage | undefined => {
		let shape = false;
		let identity = false;
		for (const attribute of attributes) {
			shape ||= attribute.schema === schema;
			identity ||= attribute.identifies === schema;
		}
		return shape && identity
			? "shape and identity"
			: shape
				? "shape"
				: identity
					? "identity"
					: undefined;
	};
	const carriers = schema.consumables;
	for (const bc of schema.boundedcontext.workspace.boundedcontexts.values()) {
		for (const owner of carriers) {
			if (owner.boundedcontext === bc)
				users.push({ kind: "consumable", boundedcontext: bc, owner });
		}
		for (const owner of bc.aggregates.values()) {
			const use = useOf(
				Array.from(owner.entities.values()).flatMap((entity) =>
					Array.from(entity.attributes.values()),
				),
			);
			if (use)
				users.push({ kind: "aggregate", boundedcontext: bc, owner, use });
		}
		for (const owner of bc.valueobjects.values()) {
			const use = useOf(owner.allAttributes);
			if (use)
				users.push({ kind: "value object", boundedcontext: bc, owner, use });
		}
		for (const owner of bc.schemas.values()) {
			const use = useOf(owner.attributes.values());
			if (owner !== schema && use)
				users.push({ kind: "schema", boundedcontext: bc, owner, use });
		}
	}
	return users;
}
