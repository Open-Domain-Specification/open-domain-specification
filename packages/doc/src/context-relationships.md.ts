import {
	type ODSContextMap,
	PATTERNS,
	withAgreementName,
} from "@open-domain-specification/core";
import { markdownTable } from "./lib/markdown-table";

/**
 * A table of the declared and implied relationships on a context map. A named
 * agreement's name follows its type, as on the map's stereotype badge, so two
 * agreements between one pair read apart (#74).
 */
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
			// An implied edge is no declared agreement, so it has no name to add.
			edge.implied
				? `${edge.type} (implied by ${edge.implied})`
				: withAgreementName(edge.type, edge.name),
			edge.target.name,
			edge.upstreamRoles.join(", ") || "-",
			edge.downstreamRoles.join(", ") || "-",
		]),
	);

/**
 * A footnote list explaining each of `used` in core's words, in knowledge-base
 * order, so a reader of the table above who does not know the vocabulary is
 * not sent elsewhere. Empty when nothing recognisable is used.
 */
export const patternNotesMd = (used: Iterable<string>) => {
	const wanted = new Set(used);
	return Object.entries(PATTERNS)
		.filter(([key]) => wanted.has(key))
		.map(
			([key, pattern]) =>
				`- \`${key}\` — **${pattern.name}** (${pattern.abbreviation}). ${pattern.summary}`,
		)
		.join("\n");
};
