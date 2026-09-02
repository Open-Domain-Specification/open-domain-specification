import type { Consumable } from "@open-domain-specification/core";
import { markdownTable } from "./lib/markdown-table";
import { pathToIndexMd } from "./lib/paths";

/** Link to the schema's row in the Schemas table of its bounded context page. */
export const schemaLinkMd = (
	consumable: Consumable,
	fromPath: string,
): string =>
	consumable.schema
		? `[${consumable.schema.name}](${pathToIndexMd(consumable.schema.boundedcontext.path, fromPath)}#schemas)`
		: "-";

const consumableRow = (consumable: Consumable, fromPath: string) => [
	consumable.name,
	consumable.type,
	consumable.internal ? "yes" : "no",
	consumable.pattern ?? "-",
	consumable.description,
	schemaLinkMd(consumable, fromPath),
	consumable.type === "operation"
		? consumable.raisedEvents.map((it) => it.name).join(", ") || "-"
		: "-",
];

/** The Provides table shared by aggregate and service pages. */
export const providesTableMd = (
	consumables: ReadonlyMap<string, Consumable>,
	fromPath: string,
): string =>
	consumables.size > 0
		? markdownTable(
				[
					"Name",
					"Type",
					"Internal",
					"Pattern",
					"Description",
					"Schema",
					"Raises",
				],
				Array.from(consumables.values()).map((it) =>
					consumableRow(it, fromPath),
				),
			)
		: "> No consumables.";
