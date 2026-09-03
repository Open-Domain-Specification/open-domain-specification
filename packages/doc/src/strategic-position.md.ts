import {
	type BoundedContext,
	type ContextRelationship,
	isSymmetricRelationship,
	narrativeText,
	relationshipNarrative,
} from "@open-domain-specification/core";
import { commentsMd } from "./comments.md";
import { patternNotesMd } from "./context-relationships.md";
import { markdownTable } from "./lib/markdown-table";

// TODO: clean-code - 0.6 - DRY: `counterpartOf` and the three-way grouping in
// `strategicPositionMd` below restate what `positionGroups` and `counterpartOf`
// already say in packages/pages/src/lib/evidence/derive.ts:28-79. Neither is
// UI-specific, so one definition belongs in core beside `relationship.ts` and
// both packages should read it. Pre-existing; left for the lead to schedule.
/** The context on the other side of a relationship from `bc`. */
const counterpartOf = (r: ContextRelationship, bc: BoundedContext) =>
	r.source === bc ? r.target : r.source;

/**
 * What the author wrote, or the sentence core generates from the same
 * relationship read from this context. Italics mark it as generated, which is
 * the muted styling the pages table uses for the same fallback.
 */
const description = (r: ContextRelationship, bc: BoundedContext) =>
	r.description ?? `*${narrativeText(relationshipNarrative(r, bc))}*`;

const row = (r: ContextRelationship, bc: BoundedContext) => [
	counterpartOf(r, bc).name,
	description(r, bc),
	r.type,
	r.upstreamRoles.join(", ") || "-",
	r.downstreamRoles.join(", ") || "-",
];

const HEADERS = [
	"With",
	"Description",
	"Type",
	"Upstream Roles",
	"Downstream Roles",
];

/**
 * The counterpart names which row a comment bullet belongs to, and the type
 * tells two relationships between the same pair of contexts apart.
 */
const commentTitle = (r: ContextRelationship, bc: BoundedContext) =>
	`**${counterpartOf(r, bc).name}** (${r.type})`;

const group = (
	label: string,
	rows: ContextRelationship[],
	bc: BoundedContext,
) => {
	if (!rows.length) return "";
	const table = markdownTable(
		HEADERS,
		rows.map((r) => row(r, bc)),
	);
	const comments = rows
		.map((r) => commentsMd(commentTitle(r, bc), r.comments))
		.filter(Boolean)
		.join("\n");
	// The trailing blank line keeps the next group's `###` off the last bullet.
	return [`### ${label}`, table, comments && `${comments}\n`]
		.filter(Boolean)
		.join("\n");
};

/**
 * The strategic position of one context (RFC-002 section 4.1), grouped the
 * same way as the pages surface: what it depends on, what depends on it, and
 * what it merely works alongside. A group with no rows is left out.
 */
export const strategicPositionMd = (boundedcontext: BoundedContext): string => {
	const mine = boundedcontext.workspace.relationships.filter(
		(r) => r.source === boundedcontext || r.target === boundedcontext,
	);
	const dependsOn = mine.filter(
		(r) => !isSymmetricRelationship(r.type) && r.target === boundedcontext,
	);
	const dependedOnBy = mine.filter(
		(r) => !isSymmetricRelationship(r.type) && r.source === boundedcontext,
	);
	const worksAlongside = mine.filter((r) => isSymmetricRelationship(r.type));

	const sections = [
		group("Depends on", dependsOn, boundedcontext),
		group("Depended on by", dependedOnBy, boundedcontext),
		group("Works alongside", worksAlongside, boundedcontext),
	].filter(Boolean);
	if (!sections.length) return "> No explicit relationships.";

	// Footnote what the type and role columns above mean, in core's words.
	const used = mine.flatMap((r) => [
		r.type,
		...r.upstreamRoles,
		...r.downstreamRoles,
	]);
	return [sections.join("\n"), patternNotesMd(used)].filter(Boolean).join("\n");
};
