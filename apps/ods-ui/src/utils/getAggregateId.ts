import type { BoundedContext, Domain, Subdomain } from "open-domain-schema";

export function getBoundedContextId(
	domain: Domain,
	subdomain: Subdomain,
	boundedContext: BoundedContext,
): string {
	return `${domain}:${subdomain}:${boundedContext}`;
}
