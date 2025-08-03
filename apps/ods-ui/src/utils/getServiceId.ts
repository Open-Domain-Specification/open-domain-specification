import type {
	BoundedContext,
	Domain,
	Service,
	Subdomain,
} from "open-domain-schema";

export function getServiceId(
	domain: Domain,
	subdomain: Subdomain,
	boundedContext: BoundedContext,
	service: Service,
): string {
	return `${domain.id}:${subdomain.id}:${boundedContext.id}:${service.id}`;
}
