import {
	type Aggregate,
	type Consumption,
	constrainableLabel,
	Entity,
	type Invariant,
	ODSRelationGraph,
	type ValueObject,
} from "@open-domain-specification/core";
import { attributeListMd } from "./attributes.md";
import { contextBreadcrumbsMd } from "./breadcrumbs.md";
import { providesTableMd } from "./consumables.md";
import { consumptionSectionMd } from "./consumptions.md";
import { markdownTable } from "./lib/markdown-table";
import {
	pathToConsumableMapSvg,
	pathToIndexMd,
	pathToRelationMapSvg,
} from "./lib/paths";
import { valueObjectsUsedBy } from "./lib/value-objects";
import type { Options } from "./options";

/** A value object the aggregate holds, linked to the context that declares it. */
const valueObjectSection =
	(aggregate: Aggregate) => (valueObject: ValueObject) => [
		"Value Object",
		`[${valueObject.name}](${pathToIndexMd(valueObject.boundedcontext.path, aggregate.path)}#value-objects)`,
		valueObject.description,
		attributeListMd(valueObject.attributes, aggregate.path),
	];

/** Where a relation end is documented: its aggregate, or its context. */
const ownerOf = (member: Entity | ValueObject) =>
	member instanceof Entity ? member.aggregate : member.boundedcontext;

const entitySection = (aggregate: Aggregate) => (entity: Entity) => [
	entity.root ? "Entity (Root)" : "Entity",
	entity.root ? `**${entity.name}**` : entity.name,
	entity.description,
	attributeListMd(entity.attributes, aggregate.path),
];

const invariantSection = (invariant: Invariant) => [
	invariant.name,
	invariant.description,
	invariant.targets.map(constrainableLabel).join(", ") || "-",
];

export const aggergateMd = (aggregate: Aggregate, options?: Options) => `
${options?.breadcrumbs ? contextBreadcrumbsMd(aggregate.boundedcontext) : ""}
# ${aggregate.name}
${aggregate.description}

![contextmap](${pathToRelationMapSvg(aggregate.path, aggregate.path)})

![consumablemap](${pathToConsumableMapSvg(aggregate.path, aggregate.path)})

## Entities and Value Objects
${
	aggregate.entities.size > 0 || valueObjectsUsedBy(aggregate).length > 0
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
						.map(entitySection(aggregate)),
					...valueObjectsUsedBy(aggregate).map(valueObjectSection(aggregate)),
				],
			)
		: ""
}

## Relationships
${markdownTable(
	["Source", "Description", "Target", "Relation", "Cardinality"],
	ODSRelationGraph.fromAggregate(aggregate).relations.map((it) => [
		// Entities have no page of their own, so a source links to the section
		// that lists it: its aggregate's page, or, for a value object, the page
		// of the context that declares it.
		`[${ownerOf(it.source).name} - ${it.source.name}](${pathToIndexMd(ownerOf(it.source).path, aggregate.path)}#${it.source instanceof Entity ? "entities-and-value-objects" : "value-objects"})`,
		it.label || "-",
		`${ownerOf(it.target).name} - ${it.target.name}`,
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
				.map(([_name, consumption]) => consumptionSectionMd(consumption))
				.join("")
		: "> No consumptions."
}
	
`;
