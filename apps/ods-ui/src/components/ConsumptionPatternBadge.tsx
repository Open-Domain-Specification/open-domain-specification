import { Badge } from "@mantine/core";
import type { ConsumptionPattern } from "@open-domain-specification/core";
import { useIsMobile } from "../hooks/useIsMobile.ts";

const abbreviatedPatterns: Record<ConsumptionPattern, string> = {
	"customer-supplier": "C/s",
	"separate-ways": "SW",
	conformist: "C",
	"anti-corruption-layer": "ACL",
	partnership: "P",
};

export function ConsumptionPatternBadge(props: {
	pattern: ConsumptionPattern;
}) {
	const isMobile = useIsMobile();

	return (
		<Badge size={isMobile ? "sm" : "md"} variant={"default"}>
			{isMobile ? abbreviatedPatterns[props.pattern] : props.pattern}
		</Badge>
	);
}
