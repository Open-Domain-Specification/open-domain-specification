import type { ODSContextMap } from "@open-domain-specification/core";
import { markdownTable } from "./lib/markdown-table";

/** A table of the declared and implied relationships on a context map. */
export const contextRelationshipsMd = (map: ODSContextMap) =>
	markdownTable(
		[
			"Upstream",
			"Relationship",
			"Downstream",
			"Upstream Roles",
			"Downstream Roles",
		],
		Array.from(map.edges.values()).map((edge) => [
			edge.source.name,
			edge.implied ? `${edge.type} (implied)` : edge.type,
			edge.target.name,
			edge.upstreamRoles.join(", ") || "-",
			edge.downstreamRoles.join(", ") || "-",
		]),
	);
