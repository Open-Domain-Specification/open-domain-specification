import type { DomainType } from "./DomainType";
import type { Subdomain } from "./Subdomain";

export type Domain = {
	id: string;
	name: string;
	type: DomainType;
	description: string;
	subdomains?: Subdomain[];
};
