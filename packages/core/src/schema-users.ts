import type {
	Aggregate,
	BoundedContext,
	Consumable,
	DataSchema,
	ValueObject,
} from "./workspace";

/** One place a schema is used, anywhere in the workspace. */
export type SchemaUser =
	| { kind: "consumable"; boundedcontext: BoundedContext; owner: Consumable }
	| { kind: "aggregate"; boundedcontext: BoundedContext; owner: Aggregate }
	| { kind: "value object"; boundedcontext: BoundedContext; owner: ValueObject }
	| { kind: "schema"; boundedcontext: BoundedContext; owner: DataSchema };

/**
 * Everything in the workspace that depends on a schema's shape, in the order a
 * reader meets it: the contexts as the workspace lists them, and within one
 * its consumables, then its aggregates, value objects and schemas; each user
 * once.
 *
 * A user is a consumable that carries the shape as its payload, its answer or
 * a refusal, or an owner with an attribute that names the schema: an
 * aggregate whose entities hold it, a value object, or another schema that
 * nests it. A payload can be carried only by nesting, as a posting line is
 * inside the entry a command posts, so the carriers alone would call that
 * shape unused. A schema that only mentions itself has no user, and an
 * attribute that merely spells the schema's name as a type does not count: the
 * link is the attribute's `schema`.
 */
export function usersOfSchema(schema: DataSchema): SchemaUser[] {
	const users: SchemaUser[] = [];
	const nests = (owner: { attributes: DataSchema["attributes"] }) =>
		Array.from(owner.attributes.values()).some(
			(attribute) => attribute.schema === schema,
		);
	const carriers = schema.consumables;
	for (const bc of schema.boundedcontext.workspace.boundedcontexts.values()) {
		for (const owner of carriers) {
			if (owner.boundedcontext === bc)
				users.push({ kind: "consumable", boundedcontext: bc, owner });
		}
		for (const owner of bc.aggregates.values()) {
			if (Array.from(owner.entities.values()).some(nests))
				users.push({ kind: "aggregate", boundedcontext: bc, owner });
		}
		for (const owner of bc.valueobjects.values()) {
			if (nests(owner))
				users.push({ kind: "value object", boundedcontext: bc, owner });
		}
		for (const owner of bc.schemas.values()) {
			if (owner !== schema && nests(owner))
				users.push({ kind: "schema", boundedcontext: bc, owner });
		}
	}
	return users;
}
