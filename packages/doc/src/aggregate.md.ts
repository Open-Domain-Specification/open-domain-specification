import {
	type Aggregate,
	type Consumption,
	constrainableLabel,
	type Entity,
	type Invariant,
	ODSRelationGraph,
	type ValueObject,
} from "@open-domain-specification/core";
import { attributeListMd } from "./attributes.md";
import { contextBreadcrumbsMd } from "./breadcrumbs.md";
import { providesTableMd } from "./consumables.md";
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
	attributeListMd(valueObject.attributes),
];

const entitySection = (entity: Entity) => [
	entity.root ? "Entity (Root)" : "Entity",
	entity.root ? `**${entity.name}**` : entity.name,
	entity.description,
	attributeListMd(entity.attributes),
];

const invariantSection = (invariant: Invariant) => [
	invariant.name,
	invariant.description,
	invariant.targets.map(constrainableLabel).join(", ") || "-",
];

const consumptionSection = (consumption: Consumption) => `
### ${consumption.consumable.name} ${consumption.pattern ? `[${consumption.pattern}]` : ""}
${consumption.consumable.description}
- **Provider**: [${consumption.consumable.provider.name}](${pathToIndexMd(consumption.consumable.provider.path, consumption.consumer.path)})
`;

export const aggergateMd = (aggregate: Aggregate, options?: Options) => `
${options?.breadcrumbs ? contextBreadcrumbsMd(aggregate.boundedcontext) : ""}
# ${aggregate.name}
${aggregate.description}

![contextmap](${pathToRelationMapSvg(aggregate.path, aggregate.path)})

![consumablemap](${pathToConsumableMapSvg(aggregate.path, aggregate.path)})

## Entities and Value Objects
${
	aggregate.entities.size > 0 || aggregate.valueobjects.size > 0
		? markdownTable(
				["Type", "Name", "Description", "Attributes"],
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
	["Source", "Description", "Target", "Relation", "Cardinality"],
	ODSRelationGraph.fromAggregate(aggregate).relations.map((it) => [
		`[${it.source.name}](${pathToIndexMd(it.source.path, aggregate.path)})`,
		it.label || "-",
		`${it.target.aggregate.name} - ${it.target.name}`,
		it.relation,
		it.cardinality ?? "-",
	]),
)}

## Invariants
${
	aggregate.invariants.size > 0
		? markdownTable(
				["Name", "Description", "Constrains"],
				Array.from(aggregate.invariants.values()).map(invariantSection),
			)
		: "> No invariants."
}

## Provides
${providesTableMd(aggregate.consumables, aggregate.path)}

## Consumes
${
	aggregate.consumptions.length > 0
		? Array.from(aggregate.consumptions.entries())
				.map(([_name, consumption]) => consumptionSection(consumption))
				.join("")
		: "> No consumptions."
}
	
`;
