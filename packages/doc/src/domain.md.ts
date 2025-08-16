import {
	type Domain,
	ODSConsumptionGraph,
	type Subdomain,
} from "@open-domain-specification/core";
import { breadcrumbsMd } from "./breadcrumbs.md";
import { markdownTable } from "./lib/markdown-table";
import { pathToContextMapSvg, pathToIndexMd } from "./lib/paths";
import type { Options } from "./options";

const subdomainSection = (subdomain: Subdomain) => `
### [${subdomain.name}](${pathToIndexMd(subdomain.path, subdomain.domain.path)})
${subdomain.description}

`;

export const domainMd = (domain: Domain, options?: Options) => `
${options?.breadcrumbs ? breadcrumbsMd(domain.workspace, domain) : ""}

# ${domain.name} (${domain.type})
${domain.description}

![contextmap](${pathToContextMapSvg(domain.path, domain.path)})

## Subdomains
${
	domain.subdomains.size > 0
		? Array.from(domain.subdomains.entries())
				.map(([_name, subdomain]) => subdomainSection(subdomain))
				.join("")
		: "> No subdomains."
}

## Relationships
${markdownTable(
	["Consumer", "Consumed As", "Provider", "Consumable", "Provided As"],
	ODSConsumptionGraph.fromDomain(domain).consumptions.map((it) => [
		`[${it.consumer.name}](${pathToIndexMd(it.consumer.path, domain.path)})`,
		it.pattern,
		it.consumable.provider.name,
		it.consumable.name,
		it.consumable.pattern,
	]),
)}
	
`;
