import { Badge } from "@mantine/core";
import type { ConsumablePattern } from "@open-domain-specification/core";
import { useIsMobile } from "../hooks/useIsMobile.ts";

const abbreviatedPatterns: Record<ConsumablePattern, string> = {
	"published-language": "PL",
	"shared-kernel": "SK",
	"open-host-service": "OHS",
	"customer-supplier": "c/S",
};

export function ConsumablePatternBadge(props: { pattern: ConsumablePattern }) {
	const isMobile = useIsMobile();

	return (
		<Badge size={isMobile ? "sm" : "md"} variant={"default"}>
			{isMobile ? abbreviatedPatterns[props.pattern] : props.pattern}
		</Badge>
	);
}
