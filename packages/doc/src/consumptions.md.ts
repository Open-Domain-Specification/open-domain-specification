import type { Consumption } from "@open-domain-specification/core";
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

/** One consumption on the page of the aggregate or service that makes it. */
export const consumptionSectionMd = (consumption: Consumption) => `
### ${consumption.consumable.name} ${consumption.pattern ? `[${consumption.pattern}]` : ""}
${consumption.consumable.description}
- **Provider**: [${consumption.consumable.provider.name}](${pathToIndexMd(consumption.consumable.provider.path, consumption.consumer.path)})${madeByMd(consumption)}
`;
