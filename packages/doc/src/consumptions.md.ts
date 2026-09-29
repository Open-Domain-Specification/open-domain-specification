import type { Consumption } from "@open-domain-specification/core";
import { markdownTable } from "./lib/markdown-table";
import { pathToIndexMd } from "./lib/paths";

/**
 * The consumer's own operations or policies behind a consumption. Absent means
 * the whole consumer depends on the consumable, so the line is left out
 * rather than filled with a placeholder.
 */
export const madeByMd = (consumption: Consumption) =>
	consumption.by.length
		? `\n- **Made by**: ${consumption.by.map((it) => it.name).join(", ")}`
		: "";

/**
 * The agreement a consumption runs under, where it names one, by name or by
 * type when the agreement is unnamed. Plain text: no relationship has a page
 * here. Left out when the consumption names none, which means the pair's only
 * agreement.
 */
export const agreementMd = (consumption: Consumption) =>
	consumption.relationship
		? `\n- **Agreement**: ${consumption.relationship.name ?? consumption.relationship.type}`
		: "";

/**
 * A Consumptions table with the Agreement column, placed after `Consumed As`,
 * only when at least one of its rows names a relationship: where a pair holds
 * one agreement nobody names it, so a table with none has nothing to show. A
 * row that names none reads "-" once the column is there, as every other
 * absent value in these tables does.
 */
export const consumptionsTableMd = (
	consumptions: Consumption[],
	headers: string[],
	row: (consumption: Consumption) => string[],
) => {
	const rows = consumptions.map(row);
	if (!consumptions.some((it) => it.relationship)) {
		return markdownTable(headers, rows);
	}
	const at = headers.indexOf("Consumed As") + 1;
	const insert = <T>(list: T[], value: T) => [
		...list.slice(0, at),
		value,
		...list.slice(at),
	];
	return markdownTable(
		insert(headers, "Agreement"),
		rows.map((row, i) =>
			insert(
				row,
				consumptions[i].relationship?.name ??
					consumptions[i].relationship?.type ??
					"-",
			),
		),
	);
};

/** One consumption on the page of the aggregate or service that makes it. */
export const consumptionSectionMd = (consumption: Consumption) => `
### ${consumption.consumable.name} ${consumption.pattern ? `[${consumption.pattern}]` : ""}
${consumption.consumable.description}
- **Provider**: [${consumption.consumable.provider.name}](${pathToIndexMd(consumption.consumable.provider.path, consumption.consumer.path)})${madeByMd(consumption)}${agreementMd(consumption)}
`;
