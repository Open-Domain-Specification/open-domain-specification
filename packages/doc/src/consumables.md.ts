import type { Consumable } from "@open-domain-specification/core";
import { commentsMd } from "./comments.md";
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

/**
 * The Provides table shared by aggregate and service pages, with whatever is
 * known about each consumable as a bullet list beneath it — the same shape a
 * relationship's comments take under their group's table, and the only place
 * a consumable has to put them, since it owns no page of its own.
 */
export const providesTableMd = (
	consumables: ReadonlyMap<string, Consumable>,
	fromPath: string,
): string => {
	if (consumables.size === 0) return "> No consumables.";
	const provided = Array.from(consumables.values());
	const table = markdownTable(
		["Name", "Type", "Internal", "Pattern", "Description", "Schema", "Raises"],
		provided.map((it) => consumableRow(it, fromPath)),
	);
	const comments = provided
		.map((it) => commentsMd(`**${it.name}**`, it.comments))
		.filter(Boolean)
		.join("\n");
	return [table, comments].filter(Boolean).join("\n");
};
