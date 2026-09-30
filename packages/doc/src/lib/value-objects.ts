import {
	type Aggregate,
	type BoundedContext,
	type DataSchema,
	Entity,
	type ValueObject,
} from "@open-domain-specification/core";

/**
 * The value objects an aggregate holds: the ones typing its entities'
 * attributes or targeted by their relations. A value object belongs to the
 * context (decision 16), so an aggregate page lists what it uses rather than
 * what it owns, and the context page reads the same relation the other way
 * round to say which aggregates hold each value.
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
export type ValueObjectUser = {
	kind: "aggregate" | "value object" | "schema";
	name: string;
	/** The owner's own path; a schema has none, so it is its context's. */
	path: string;
	/** The section of that page a non-aggregate user is written up in. */
	anchor: string;
	boundedcontext: BoundedContext;
};

/**
 * Everything in the workspace that uses a value object, in the order a reader
 * meets it: the contexts as the workspace lists them, and within one its
 * aggregates, then its value objects, then its schemas.
 *
 * The column's promise is every user, in any context, because a value object
 * is borrowed across a kernel or a directed relationship (decision 16) and a
 * list of only the home context's users reads as if nobody else depends on
 * it. That is the set the pages reader lists (`usagesOf`), plus the relations
 * that target the value, which an aggregate holds as surely as an attribute.
 * Nested users are inside the promise: a value object or schema whose
 * attribute is typed by this one depends on it as much as an aggregate does,
 * and leaving them out would hide a change's reach. A value object that is a
 * kind of this one is not a user; it is listed under Kinds and the value
 * reaches it by inheritance, not by an attribute.
 */
export function usersOfValueObject(
	valueObject: ValueObject,
): ValueObjectUser[] {
	const users: ValueObjectUser[] = [];
	const types = (owner: ValueObject | DataSchema) =>
		Array.from(owner.attributes.values()).some(
			(it) => it.valueobject === valueObject,
		);
	for (const bc of valueObject.boundedcontext.workspace.boundedcontexts.values()) {
		for (const aggregate of bc.aggregates.values()) {
			if (valueObjectsUsedBy(aggregate).includes(valueObject))
				users.push({
					kind: "aggregate",
					name: aggregate.name,
					path: aggregate.path,
					anchor: "",
					boundedcontext: bc,
				});
		}
		for (const other of bc.valueobjects.values()) {
			if (types(other))
				users.push({
					kind: "value object",
					name: other.name,
					path: bc.path,
					anchor: "#value-objects",
					boundedcontext: bc,
				});
		}
		for (const schema of bc.schemas.values()) {
			if (types(schema))
				users.push({
					kind: "schema",
					name: schema.name,
					path: bc.path,
					anchor: "#schemas",
					boundedcontext: bc,
				});
		}
	}
	return users;
}
