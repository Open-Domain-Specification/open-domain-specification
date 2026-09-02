import type { Aggregate } from "@open-domain-specification/core";

/**
 * Money as a value object, declared once in every aggregate that carries an
 * amount. Minor units and an ISO 4217 code, so no float ever touches a price.
 * The description can say what the organisation makes of it.
 */
export function money(
	aggregate: Aggregate,
	description = "An amount in a currency: minor units and an ISO 4217 code",
) {
	const vo = aggregate.addValueObject("Money", { description });
	vo.addAttribute("amountMinor", { type: "int64" });
	vo.addAttribute("currency", { type: "ISO 4217 code" });
	return vo;
}
