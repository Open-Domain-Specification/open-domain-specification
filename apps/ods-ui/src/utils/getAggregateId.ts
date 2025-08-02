import type {
	Aggregate,
	BoundedContext,
	Domain,
	Subdomain,
} from "open-domain-schema";

export function getAggregateId(
	domain: Domain,
	subdomain: Subdomain,
	boundedContext: BoundedContext,
	aggregate: Aggregate,
): string {
	return `${domain.id}:${subdomain.id}:${boundedContext.id}:${aggregate.id}`;
}
