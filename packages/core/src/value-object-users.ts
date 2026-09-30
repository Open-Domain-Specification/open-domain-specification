import {
	type Aggregate,
	type BoundedContext,
	type DataSchema,
	Entity,
	type ValueObject,
} from "./workspace";

/**
 * The value objects an aggregate holds: the ones typing its entities'
 * attributes or targeted by their relations. A value object belongs to the
 * context (decision 16), so this is what the aggregate uses of it.
 */
export function valueObjectsUsedBy(aggregate: Aggregate): ValueObject[] {
	const used = new Set<ValueObject>();
	for (const entity of aggregate.entities.values()) {
		for (const attribute of entity.attributes.values()) {
			if (attribute.valueobject) used.add(attribute.valueobject);
		}
		for (const relation of entity.relations) {
			if (!(relation.target instanceof Entity)) used.add(relation.target);
		}
	}
	return Array.from(used).sort((a, b) => a.name.localeCompare(b.name));
}

/** One place a value object is used, anywhere in the workspace. */
export type ValueObjectUser =
	| { kind: "aggregate"; boundedcontext: BoundedContext; owner: Aggregate }
	| { kind: "value object"; boundedcontext: BoundedContext; owner: ValueObject }
	| { kind: "schema"; boundedcontext: BoundedContext; owner: DataSchema };

/**
 * Everything in the workspace that uses a value object, in the order a reader
 * meets it: the contexts as the workspace lists them, and within one its
 * aggregates, then its value objects, then its schemas; each user once.
 *
 * A value object is borrowed across a kernel or a directed relationship
 * (decision 16), so a list of only the declaring context's users reads as if
 * nobody else depends on it. A user is an aggregate whose entities type the
 * value or relate to it, a value object whose attributes type it or whose
 * relations target it, or a schema whose attributes type it. A value object
 * that is only a kind of this one is not a user: it reaches the value by
 * inheritance, and is listed under Kinds.
 */
export function usersOfValueObject(
	valueObject: ValueObject,
): ValueObjectUser[] {
	const users: ValueObjectUser[] = [];
	const typedBy = (owner: ValueObject | DataSchema) =>
		Array.from(owner.attributes.values()).some(
			(attribute) => attribute.valueobject === valueObject,
		);
	for (const bc of valueObject.boundedcontext.workspace.boundedcontexts.values()) {
		for (const owner of bc.aggregates.values()) {
			if (valueObjectsUsedBy(owner).includes(valueObject))
				users.push({ kind: "aggregate", boundedcontext: bc, owner });
		}
		for (const owner of bc.valueobjects.values()) {
			if (
				typedBy(owner) ||
				owner.relations.some((it) => it.target === valueObject)
			)
				users.push({ kind: "value object", boundedcontext: bc, owner });
		}
		for (const owner of bc.schemas.values()) {
			if (typedBy(owner))
				users.push({ kind: "schema", boundedcontext: bc, owner });
		}
	}
	return users;
}
