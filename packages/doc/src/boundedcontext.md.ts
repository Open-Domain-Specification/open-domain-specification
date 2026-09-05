import {
	type Aggregate,
	type BoundedContext,
	constrainableLabel,
	type DataSchema,
	type Invariant,
	ODSConsumptionGraph,
	type Policy,
	type Service,
	type ValueObject,
} from "@open-domain-specification/core";
import { attributeListMd } from "./attributes.md";
import { contextBreadcrumbsMd } from "./breadcrumbs.md";
import { glossaryTableMd } from "./glossary.md";
import { markdownTable } from "./lib/markdown-table";
import {
	pathToContextMapSvg,
	pathToFlowMapSvg,
	pathToIndexMd,
} from "./lib/paths";
import { aggregatesHolding } from "./lib/value-objects";
import type { Options } from "./options";
import { strategicPositionMd } from "./strategic-position.md";
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
	attributeListMd(schema.attributes, schema.boundedcontext.path),
	schema.consumables.map((it) => it.name).join(", ") || "-",
];

const valueObjectSection = (valueObject: ValueObject) => [
	valueObject.name,
	valueObject.description,
	attributeListMd(valueObject.attributes, valueObject.boundedcontext.path),
	aggregatesHolding(valueObject)
		.map((it) => it.name)
		.join(", ") || "-",
];

// The same three columns the aggregate page uses, because a rule reads the
// same either way; what changes is which boundary keeps it (decision 27).
const invariantSection = (invariant: Invariant) => [
	invariant.name,
	invariant.description,
	invariant.targets.map(constrainableLabel).join(", ") || "-",
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

## Invariants
${
	boundedcontext.invariants.size > 0
		? `Rules that hold across this context's instances and aggregates; each names the operation that checks it before acting.

${markdownTable(
	["Name", "Description", "Constrains"],
	Array.from(boundedcontext.invariants.values()).map(invariantSection),
)}`
		: "> No invariants across aggregates."
}

## Value Objects
${
	boundedcontext.valueobjects.size > 0
		? markdownTable(
				["Name", "Description", "Attributes", "Used by"],
				Array.from(boundedcontext.valueobjects.values()).map(
					valueObjectSection,
				),
			)
		: "> No value objects."
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
${strategicPositionMd(boundedcontext)}

## Consumptions
${markdownTable(
	[
		"Consumer",
		"Made By",
		"Consumed As",
		"Provider",
		"Consumable",
		"Provided As",
	],
	ODSConsumptionGraph.fromBoundedContext(boundedcontext).consumptions.map(
		(it) => [
			`[${it.consumer.name}](${pathToIndexMd(it.consumer.path, boundedcontext.path)})`,
			// Absent means the whole consumer, which is the common case.
			it.by.map((by) => by.name).join(", ") || "-",
			it.pattern ?? "-",
			it.consumable.provider.name,
			it.consumable.name,
			it.consumable.pattern ?? "-",
		],
	),
)}

`;
