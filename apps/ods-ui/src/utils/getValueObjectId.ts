import type {
	Aggregate,
	BoundedContext,
	Domain,
	Subdomain,
	ValueObject,
} from "open-domain-schema";

export function getValueObjectId(
	domain: Domain,
	subdomain: Subdomain,
	boundedContext: BoundedContext,
	aggregate: Aggregate,
	valueObject: ValueObject,
): string {
	return `${domain.id}:${subdomain.id}:${boundedContext.id}:${aggregate.id}:${valueObject.id}`;
}
