import type { Domain, Subdomain } from "open-domain-schema";

export function getSubdomainId(domain: Domain, subdomain: Subdomain): string {
	return `${domain}:${subdomain}`;
}
