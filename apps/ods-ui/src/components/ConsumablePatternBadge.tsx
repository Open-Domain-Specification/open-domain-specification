import { Badge } from "@mantine/core";
import type { UpstreamRole } from "@open-domain-specification/core";
import { useIsMobile } from "../hooks/useIsMobile.ts";

const abbreviatedRoles: Record<UpstreamRole, string> = {
	"published-language": "PL",
	"open-host-service": "OHS",
};

/** The upstream role a consumable is offered under; renders nothing when unset. */
export function ConsumablePatternBadge(props: { pattern?: UpstreamRole }) {
	const isMobile = useIsMobile();
	if (!props.pattern) return null;

	return (
		<Badge size={isMobile ? "sm" : "md"} variant={"default"}>
			{isMobile ? abbreviatedRoles[props.pattern] : props.pattern}
		</Badge>
	);
}
