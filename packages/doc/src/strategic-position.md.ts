import type { BoundedContext, ContextRelationship } from "@open-domain-specification/core";
import { patternNotesMd } from "./context-relationships.md";
import { markdownTable } from "./lib/markdown-table";

/** Relationship types with no upstream or downstream side (RFC-002 section 4.1). */
const SYMMETRIC = new Set(["partnership", "shared-kernel", "separate-ways"]);
const isSymmetricRelationship = (type: string) => SYMMETRIC.has(type);

/** The context on the other side of a relationship from `bc`. */
const counterpartOf = (r: ContextRelationship, bc: BoundedContext) =>
	r.source === bc ? r.target : r.source;

const row = (r: ContextRelationship, bc: BoundedContext) => [
	counterpartOf(r, bc).name,
	r.description ?? "-",
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

const group = (label: string, rows: ContextRelationship[], bc: BoundedContext) =>
	rows.length
		? `### ${label}\n${markdownTable(HEADERS, rows.map((r) => row(r, bc)))}`
		: "";

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
