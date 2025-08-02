import type {
	Aggregate,
	BoundedContext,
	Domain,
	Entity,
	Subdomain,
} from "open-domain-schema";

export function getEntityId(
	domain: Domain,
	subdomain: Subdomain,
	boundedContext: BoundedContext,
	aggregate: Aggregate,
	entity: Entity,
): string {
	return `${domain.id}:${subdomain.id}:${boundedContext.id}:${aggregate.id}:${entity.id}`;
}
