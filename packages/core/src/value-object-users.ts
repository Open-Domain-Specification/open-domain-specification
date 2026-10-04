import { mayBorrowFrom } from "./borrowing";
import { scopeAround } from "./scope";
import {
	type Aggregate,
	type BoundedContext,
	type DataSchema,
	Entity,
	ValueObject,
} from "./workspace";
import { identityKeyOf } from "./workspace-set";

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
	| {
			kind: "aggregate";
			boundedcontext: BoundedContext;
			owner: Aggregate;
			through: ValueObject[];
	  }
	| {
			kind: "value object";
			boundedcontext: BoundedContext;
			owner: ValueObject;
			through: ValueObject[];
			asKind: boolean;
	  }
	| {
			kind: "schema";
			boundedcontext: BoundedContext;
			owner: DataSchema;
			through: ValueObject[];
	  };

/**
 * Everything in the workspace that uses a value object, in the order a reader
 * meets it: the contexts as the workspace lists them, and within one its
 * aggregates, then its value objects, then its schemas; each user once.
 *
 * A value object is borrowed across a kernel or a directed relationship
 * (decision 16), so a list of only the declaring context's users reads as if
 * nobody else depends on it. A user is an aggregate, value object or schema
 * that types or relates to the value, one of its ancestors, or one of its
 * kinds. Kinds themselves are users of the parent they specialise: that
 * specialisation also backs borrowing in the validator. A holder reached
 * through a parent or kind says which one, so it does not imply that its
 * attribute names this exact value object. A parent-typed holder is a user of
 * a foreign kind only if it may borrow that kind's context; an upstream holder
 * cannot depend on a downstream kind. Inherited attributes and relations of a
 * kind count too. A recursive value does not count as its own user, as with a
 * self-nesting schema. Each other owner appears once even when it uses several
 * members of the same hierarchy.
 */
export function usersOfValueObject(
	valueObject: ValueObject,
): ValueObjectUser[] {
	const users: ValueObjectUser[] = [];
	const scope = scopeAround(valueObject.boundedcontext.workspace);
	const related = (candidate: ValueObject, holder: BoundedContext) =>
		candidate === valueObject ||
		candidate.ancestors.includes(valueObject) ||
		(valueObject.ancestors.includes(candidate) &&
			(holder === valueObject.boundedcontext ||
				mayBorrowFrom(scope, holder, valueObject.boundedcontext)));
	const through = (direct: Iterable<ValueObject>, holder: BoundedContext) =>
		Array.from(new Set(direct))
			.filter(
				(candidate) => candidate !== valueObject && related(candidate, holder),
			)
			.sort((a, b) => identityKeyOf(a).localeCompare(identityKeyOf(b)));
	const typedBy = (owner: ValueObject | DataSchema) =>
		Array.from(
			owner instanceof ValueObject
				? owner.allAttributes
				: owner.attributes.values(),
		)
			.map((attribute) => attribute.valueobject)
			.filter(
				(candidate): candidate is ValueObject =>
					!!candidate && related(candidate, owner.boundedcontext),
			);
	for (const bc of scope.contexts()) {
		for (const owner of bc.aggregates.values()) {
			const direct = valueObjectsUsedBy(owner).filter((candidate) =>
				related(candidate, bc),
			);
			if (direct.length)
				users.push({
					kind: "aggregate",
					boundedcontext: bc,
					owner,
					through: through(direct, bc),
				});
		}
		for (const owner of bc.valueobjects.values()) {
			if (owner === valueObject) continue;
			const direct = [
				...typedBy(owner),
				...owner.allRelations
					.map((relation) => relation.target)
					.filter(
						(candidate): candidate is ValueObject =>
							candidate instanceof ValueObject && related(candidate, bc),
					),
			];
			const asKind = owner.ancestors.includes(valueObject);
			if (direct.length || asKind)
				users.push({
					kind: "value object",
					boundedcontext: bc,
					owner,
					through: through(direct, bc),
					asKind,
				});
		}
		for (const owner of bc.schemas.values()) {
			const direct = typedBy(owner);
			if (direct.length)
				users.push({
					kind: "schema",
					boundedcontext: bc,
					owner,
					through: through(direct, bc),
				});
		}
	}
	return users;
}
