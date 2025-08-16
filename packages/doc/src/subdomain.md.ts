import {
	type BoundedContext,
	ODSConsumptionGraph,
	type Subdomain,
} from "@open-domain-specification/core";
import { breadcrumbsMd } from "./breadcrumbs.md";
import { markdownTable } from "./lib/markdown-table";
import { pathToContextMapSvg, pathToIndexMd } from "./lib/paths";
import type { Options } from "./options";

const boundedContextSection = (boundedcontext: BoundedContext) => `
### [${boundedcontext.name}](${pathToIndexMd(boundedcontext.path, boundedcontext.subdomain.path)})
${boundedcontext.description}

`;

export const subdomainMd = (subdomain: Subdomain, options?: Options) => `
${options?.breadcrumbs ? breadcrumbsMd(subdomain.domain.workspace, subdomain.domain, subdomain) : ""}
# ${subdomain.name}
${subdomain.description}

![contextmap](${pathToContextMapSvg(subdomain.path, subdomain.path)})

## Bounded Contexts
${
	subdomain.boundedcontexts.size > 0
		? Array.from(subdomain.boundedcontexts.entries())
				.map(([_name, boundedcontext]) => boundedContextSection(boundedcontext))
				.join("")
		: "> No bounded contexts."
}

## Relationships
${markdownTable(
	["Consumer", "Consumed As", "Provider", "Consumable", "Provided As"],
	ODSConsumptionGraph.fromSubdomain(subdomain).consumptions.map((it) => [
		`[${it.consumer.name}](${pathToIndexMd(it.consumer.path, subdomain.path)})`,
		it.pattern,
		it.consumable.provider.name,
		it.consumable.name,
		it.consumable.pattern,
	]),
)}	
	
`;
