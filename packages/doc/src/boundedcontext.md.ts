import {
	type Aggregate,
	type BoundedContext,
	ODSConsumptionGraph,
	type Service,
} from "@open-domain-specification/core";
import { breadcrumbsMd } from "./breadcrumbs.md";
import { markdownTable } from "./lib/markdown-table";
import { pathToContextMapSvg, pathToIndexMd } from "./lib/paths";
import type { Options } from "./options";

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
${options?.breadcrumbs ? breadcrumbsMd(boundedcontext.subdomain.domain.workspace, boundedcontext.subdomain.domain, boundedcontext.subdomain, boundedcontext) : ""}
# ${boundedcontext.name}
${boundedcontext.description}

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

## Relationships
${markdownTable(
	["Consumer", "Consumed As", "Provider", "Consumable", "Provided As"],
	ODSConsumptionGraph.fromBoundedContext(boundedcontext).consumptions.map(
		(it) => [
			`[${it.consumer.name}](${pathToIndexMd(it.consumer.path, boundedcontext.path)})`,
			it.pattern,
			it.consumable.provider.name,
			it.consumable.name,
			it.consumable.pattern,
		],
	),
)}

`;
