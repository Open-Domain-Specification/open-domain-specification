import type {
	BoundedContext,
	ContextRelationship,
	Domain,
	Subdomain,
} from "open-domain-schema";

export function getRelationshipId(
	domain: Domain,
	subdomain: Subdomain,
	boundedContext: BoundedContext,
	relationship: ContextRelationship,
): string {
	return `${domain.id}:${subdomain.id}:${boundedContext.id}:${boundedContext.id}:${relationship.target}`;
}
