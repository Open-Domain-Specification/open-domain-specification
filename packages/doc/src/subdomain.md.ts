import {
	type BoundedContext,
	ODSConsumptionGraph,
	ODSContextMap,
	type Subdomain,
} from "@open-domain-specification/core";
import { breadcrumbsMd } from "./breadcrumbs.md";
import { consumptionsTableMd } from "./consumptions.md";
import { contextRelationshipsMd } from "./context-relationships.md";
import { pathToContextMapSvg, pathToIndexMd } from "./lib/paths";
import type { Options } from "./options";

const boundedContextSection = (
	subdomain: Subdomain,
	boundedcontext: BoundedContext,
) => `
### [${boundedcontext.name}](${pathToIndexMd(boundedcontext.path, subdomain.path)})
${boundedcontext.description}

`;

export const subdomainMd = (subdomain: Subdomain, options?: Options) => `
${options?.breadcrumbs ? breadcrumbsMd(subdomain.domain.workspace, subdomain.domain, subdomain) : ""}
# ${subdomain.name} (${subdomain.type})
${subdomain.description}

![contextmap](${pathToContextMapSvg(subdomain.path, subdomain.path)})

## Bounded Contexts
${
	subdomain.boundedcontexts.size > 0
		? Array.from(subdomain.boundedcontexts.entries())
				.map(([_name, boundedcontext]) =>
					boundedContextSection(subdomain, boundedcontext),
				)
				.join("")
		: "> No bounded contexts."
}

## Context Relationships
${contextRelationshipsMd(ODSContextMap.fromSubdomain(subdomain))}

## Consumptions
${consumptionsTableMd(
	ODSConsumptionGraph.fromSubdomain(subdomain).consumptions,
	["Consumer", "Consumed As", "Provider", "Consumable", "Provided As"],
	(it) => [
		`[${it.consumer.name}](${pathToIndexMd(it.consumer.path, subdomain.path)})`,
		it.pattern ?? "-",
		it.consumable.provider.name,
		it.consumable.name,
		it.consumable.pattern ?? "-",
	],
)}	
	
`;
