import {
	type Aggregate,
	type BoundedContext,
	type DataSchema,
	ODSConsumptionGraph,
	ODSContextMap,
	type Policy,
	type Service,
} from "@open-domain-specification/core";
import { attributeListMd } from "./attributes.md";
import { contextBreadcrumbsMd } from "./breadcrumbs.md";
import { contextRelationshipsMd } from "./context-relationships.md";
import { glossaryTableMd } from "./glossary.md";
import { markdownTable } from "./lib/markdown-table";
import {
	pathToContextMapSvg,
	pathToFlowMapSvg,
	pathToIndexMd,
} from "./lib/paths";
import type { Options } from "./options";
import { teamLinkMd } from "./team.md";

const aggregateSection = (aggregate: Aggregate) => `
### [${aggregate.name}](${pathToIndexMd(aggregate.path, aggregate.boundedcontext.path)})
${aggregate.description}

`;

const policySection = (policy: Policy) => [
	policy.name,
	policy.description,
	policy.events.map((it) => it.name).join(", ") || "-",
	policy.commands.map((it) => it.name).join(", ") || "-",
];

const schemaSection = (schema: DataSchema) => [
	schema.name,
	schema.description ?? "-",
	attributeListMd(schema.attributes),
	schema.consumables.map((it) => it.name).join(", ") || "-",
];

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

## Glossary
${glossaryTableMd(boundedcontext)}

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

## Schemas
${
	boundedcontext.schemas.size > 0
		? markdownTable(
				["Name", "Description", "Attributes", "Used by"],
				Array.from(boundedcontext.schemas.values()).map(schemaSection),
			)
		: "> No schemas."
}

## Policies
${
	boundedcontext.policies.size > 0
		? `![flowmap](${pathToFlowMapSvg(boundedcontext.path, boundedcontext.path)})

${markdownTable(
	["Name", "Description", "On", "Then"],
	Array.from(boundedcontext.policies.values()).map(policySection),
)}`
		: "> No policies."
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
