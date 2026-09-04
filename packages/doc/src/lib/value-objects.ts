import {
	type Aggregate,
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

/** The aggregates of a value object's own context that hold it. */
export function aggregatesHolding(valueObject: ValueObject): Aggregate[] {
	return Array.from(valueObject.boundedcontext.aggregates.values()).filter(
		(aggregate) => valueObjectsUsedBy(aggregate).includes(valueObject),
	);
}
