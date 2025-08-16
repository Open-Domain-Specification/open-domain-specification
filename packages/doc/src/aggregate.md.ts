import {
	type Aggregate,
	type Consumable,
	type Consumption,
	type Entity,
	type Invariant,
	ODSRelationGraph,
	type ValueObject,
} from "@open-domain-specification/core";
import { breadcrumbsMd } from "./breadcrumbs.md";
import { markdownTable } from "./lib/markdown-table";
import {
	pathToConsumableMapSvg,
	pathToIndexMd,
	pathToRelationMapSvg,
} from "./lib/paths";
import type { Options } from "./options";

const valueObjectSection = (valueObject: ValueObject) => [
	"Value Object",
	valueObject.name,
	valueObject.description,
];

const entitySection = (entity: Entity) => [
	entity.root ? "Entity (Root)" : "Entity",
	entity.root ? `**${entity.name}**` : entity.name,
	entity.description,
];

const consumableSection = (consumable: Consumable) => `
### (${consumable.type}) - ${consumable.name} [${consumable.pattern}]
${consumable.description}
`;

const invariantSection = (invariant: Invariant) => [
	invariant.name,
	invariant.description,
];

const consumptionSection = (consumption: Consumption) => `
### ${consumption.consumable.name} [${consumption.pattern}]
${consumption.consumable.description}
- **Provider**: [${consumption.consumable.provider.name}](${pathToIndexMd(consumption.consumable.provider.path, consumption.consumer.path)})
`;

export const aggergateMd = (aggregate: Aggregate, options?: Options) => `
${options?.breadcrumbs ? breadcrumbsMd(aggregate.boundedcontext.subdomain.domain.workspace, aggregate.boundedcontext.subdomain.domain, aggregate.boundedcontext.subdomain, aggregate.boundedcontext) : ""}
# ${aggregate.name}
${aggregate.description}

![contextmap](${pathToRelationMapSvg(aggregate.path, aggregate.path)})

![consumablemap](${pathToConsumableMapSvg(aggregate.path, aggregate.path)})

## Entities and Value Objects
${
	aggregate.entities.size > 0 || aggregate.valueobjects.size > 0
		? markdownTable(
				["Type", "Name", "Description"],
				[
					...Array.from(aggregate.entities.values())
						.sort((a, b) =>
							a.root === b.root
								? a.name.localeCompare(b.name)
								: a.root
									? -1
									: 1,
						)
						.map(entitySection),
					...Array.from(aggregate.valueobjects.values()).map(
						valueObjectSection,
					),
				],
			)
		: ""
}

## Relationships
${markdownTable(
	["Source", "Description", "Target", "Relation"],
	ODSRelationGraph.fromAggregate(aggregate).relations.map((it) => [
		`[${it.source.name}](${pathToIndexMd(it.source.path, aggregate.path)})`,
		it.label || "-",
		`${it.target.aggregate.name} - ${it.target.name}`,
		it.relation,
	]),
)}

## Invariants
${
	aggregate.invariants.size > 0
		? markdownTable(
				["Name", "Description"],
				Array.from(aggregate.invariants.values()).map(invariantSection),
			)
		: "> No invariants."
}

## Provides
${
	aggregate.consumables.size > 0
		? Array.from(aggregate.consumables.entries())
				.map(([_name, consumable]) => consumableSection(consumable))
				.join("")
		: "> No consumables."
}

## Consumes
${
	aggregate.consumptions.length > 0
		? Array.from(aggregate.consumptions.entries())
				.map(([_name, consumption]) => consumptionSection(consumption))
				.join("")
		: "> No consumptions."
}
	
`;
