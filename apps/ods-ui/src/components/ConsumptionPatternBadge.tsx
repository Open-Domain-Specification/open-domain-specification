import { Badge } from "@mantine/core";
import type { DownstreamRole } from "@open-domain-specification/core";
import { useIsMobile } from "../hooks/useIsMobile.ts";

const abbreviatedRoles: Record<DownstreamRole, string> = {
	conformist: "CF",
	"anti-corruption-layer": "ACL",
};

/** The downstream role a consumer adopts; renders nothing when unset. */
export function ConsumptionPatternBadge(props: { pattern?: DownstreamRole }) {
	const isMobile = useIsMobile();
	if (!props.pattern) return null;

	return (
		<Badge size={isMobile ? "sm" : "md"} variant={"default"}>
			{isMobile ? abbreviatedRoles[props.pattern] : props.pattern}
		</Badge>
	);
}
