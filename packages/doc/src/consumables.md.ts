import {
	type Consumable,
	type DataSchema,
	reachedEvents,
} from "@open-domain-specification/core";
import { commentsMd } from "./comments.md";
import { markdownTable } from "./lib/markdown-table";
import { pathToIndexMd } from "./lib/paths";

/** Link one schema to its row in the Schemas table of its bounded context page. */
const schemaRowLinkMd = (schema: DataSchema, fromPath: string): string =>
	`[${schema.name}](${pathToIndexMd(schema.boundedcontext.path, fromPath)}#schemas)`;

/** Link to the schema's row in the Schemas table of its bounded context page. */
export const schemaLinkMd = (
	consumable: Consumable,
	fromPath: string,
): string =>
	consumable.schema ? schemaRowLinkMd(consumable.schema, fromPath) : "-";

/**
 * The shape the operation answers with, linked the same way its payload is,
 * and said as "many X" where the answer is a list of that shape rather than
 * one of it (decision 13, amended).
 */
const returnsLinkMd = (consumable: Consumable, fromPath: string): string => {
	if (!consumable.returns) return "-";
	const link = schemaRowLinkMd(consumable.returns, fromPath);
	return consumable.returnsMany ? `many ${link}` : link;
};

/** Every shape the operation refuses with, linked the same way its payload is. */
const rejectsLinkMd = (consumable: Consumable, fromPath: string): string =>
	consumable.rejects.map((it) => schemaRowLinkMd(it, fromPath)).join(", ") ||
	"-";

const consumableRow = (consumable: Consumable, fromPath: string) => [
	consumable.name,
	consumable.type,
	consumable.internal ? "yes" : "no",
	consumable.pattern ?? "-",
	consumable.description,
	schemaLinkMd(consumable, fromPath),
	returnsLinkMd(consumable, fromPath),
	rejectsLinkMd(consumable, fromPath),
	consumable.type === "operation"
		? consumable.raisedEvents.map((it) => it.name).join(", ") || "-"
		: "-",
	// The invariants that name this consumable: the rules it has to uphold
	// every time it runs, which is what makes a transition rule readable from
	// the operation as well as from the aggregate's Invariants table.
	consumable.invariants.map((it) => it.name).join(", ") || "-",
];

/**
 * The events an operation reaches through the operations it calls, said in a
 * sentence beneath the table rather than in a column of its own. A front that
 * runs an aggregate's transition declares no `raises`, so its Raises cell is
 * `-` and a reader would otherwise take it for an operation with no effect
 * (card 77). Empty when the operation reaches nothing beyond what it raises,
 * so a caller can filter it out.
 */
const reachesMd = (consumable: Consumable): string => {
	if (consumable.type !== "operation") return "";
	const reached = reachedEvents(consumable).filter(
		(it) => !consumable.raisedEvents.includes(it),
	);
	return reached.length
		? `- **${consumable.name}** also reaches ${reached.map((it) => it.name).join(", ")} through the operations it calls, raised where they happen rather than restated here.`
		: "";
};

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
		[
			"Name",
			"Type",
			"Internal",
			"Pattern",
			"Description",
			"Schema",
			"Returns",
			"Rejects with",
			"Raises",
			"Guarded by",
		],
		provided.map((it) => consumableRow(it, fromPath)),
	);
	const reaches = provided.map(reachesMd).filter(Boolean).join("\n");
	const comments = provided
		.map((it) => commentsMd(`**${it.name}**`, it.comments))
		.filter(Boolean)
		.join("\n");
	return [table, reaches, comments].filter(Boolean).join("\n");
};
