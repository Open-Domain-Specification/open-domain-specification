import {
	type Aggregate,
	type BoundedContext,
	ODSConsumptionGraph,
	ODSContextMap,
	type Service,
} from "@open-domain-specification/core";
import { contextBreadcrumbsMd } from "./breadcrumbs.md";
import { contextRelationshipsMd } from "./context-relationships.md";
import { markdownTable } from "./lib/markdown-table";
import { pathToContextMapSvg, pathToIndexMd } from "./lib/paths";
import type { Options } from "./options";
import { teamLinkMd } from "./team.md";

const aggregateSection = (aggregate: Aggregate) => `
### [${aggregate.name}](${pathToIndexMd(aggregate.path, aggregate.boundedcontext.path)})
${aggregate.description}

`;

const serviceSection = (service: Service) => `
### [${service.name}](${pathToIndexMd(service.path, service.boundedcontext.path)})
${service.description}

`;

export const boundedcontextMd = (
	boundedcontext: BoundedContext,
	options?: Options,
) => `
${options?.breadcrumbs ? contextBreadcrumbsMd(boundedcontext) : ""}
# ${boundedcontext.name}
${boundedcontext.bigBallOfMud ? "> ⚠️ **Big ball of mud.** This context's model is not coherent; neighbours should protect themselves with an anti-corruption layer.\n\n" : ""}${boundedcontext.description}

${boundedcontext.team ? `**Owned by:** ${teamLinkMd(boundedcontext.team)}\n` : ""}
## Serves
${
	boundedcontext.subdomains.size > 0
		? Array.from(boundedcontext.subdomains)
				.map(
					(subdomain) =>
						`- [${subdomain.domain.name} / ${subdomain.name}](${pathToIndexMd(subdomain.path, boundedcontext.path)}) (${subdomain.type})`,
				)
				.join("\n")
		: "> No subdomains."
}

![contextmap](${pathToContextMapSvg(boundedcontext.path, boundedcontext.path)})

## Aggregates
${
	boundedcontext.aggregates.size > 0
		? Array.from(boundedcontext.aggregates.entries())
				.map(([_name, aggregate]) => aggregateSection(aggregate))
				.join("")
		: "> No aggregates."
}
	
## Services
${
	boundedcontext.services.size > 0
		? Array.from(boundedcontext.services.entries())
				.map(([_name, service]) => serviceSection(service))
				.join("")
		: "> No services."
}

## Context Relationships
${contextRelationshipsMd(ODSContextMap.fromBoundedContext(boundedcontext))}

## Consumptions
${markdownTable(
	["Consumer", "Consumed As", "Provider", "Consumable", "Provided As"],
	ODSConsumptionGraph.fromBoundedContext(boundedcontext).consumptions.map(
		(it) => [
			`[${it.consumer.name}](${pathToIndexMd(it.consumer.path, boundedcontext.path)})`,
			it.pattern ?? "-",
			it.consumable.provider.name,
			it.consumable.name,
			it.consumable.pattern ?? "-",
		],
	),
)}

`;
