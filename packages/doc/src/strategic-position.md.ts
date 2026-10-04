import {
	type BoundedContext,
	type ContextRelationship,
	counterpartOf,
	hasAuthoredDescription,
	narrativeText,
	type PositionGroup,
	relationshipNarrative,
	scopeAround,
	strategicPositionOf,
	withAgreementName,
} from "@open-domain-specification/core";
import { commentsMd } from "./comments.md";
import { patternNotesMd } from "./context-relationships.md";
import { markdownTable } from "./lib/markdown-table";

/**
 * What the author wrote, or the sentence core generates from the same
 * relationship read from this context. The suffix `(generated)` is the marker
 * that says which it is, as the pages table's `generated` keyword does for the
 * same fallback; the italics are only the muted look.
 */
const description = (r: ContextRelationship, bc: BoundedContext) =>
	hasAuthoredDescription(r)
		? (r.description as string)
		: `*${narrativeText(relationshipNarrative(r, bc))}* (generated)`;

/** The type carries a named agreement's name, so two rows with one counterpart read apart (#74). */
const row = (r: ContextRelationship, bc: BoundedContext) => [
	counterpartOf(r, bc).name,
	description(r, bc),
	withAgreementName(r.type, r.name),
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
 * The counterpart names which row a comment bullet belongs to, and the type,
 * with a named agreement's name, tells two relationships between the same
 * pair of contexts apart: one pair may hold two agreements of one type (#74).
 */
const commentTitle = (r: ContextRelationship, bc: BoundedContext) =>
	`**${counterpartOf(r, bc).name}** (${withAgreementName(r.type, r.name)})`;

const group = (
	{ label, relationships: rows }: PositionGroup,
	bc: BoundedContext,
) => {
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
	// A relationship about this context may be declared in any file of its set,
	// so the whole set is read; a workspace alone is its own scope.
	const { relationships: mine, groups } = strategicPositionOf(
		boundedcontext,
		scopeAround(boundedcontext.workspace).relationships,
	);
	if (!groups.length) return "> No explicit relationships.";
	const sections = groups.map((g) => group(g, boundedcontext));

	// Footnote what the type and role columns above mean, in core's words.
	const used = mine.flatMap((r) => [
		r.type,
		...r.upstreamRoles,
		...r.downstreamRoles,
	]);
	return [sections.join("\n"), patternNotesMd(used)].filter(Boolean).join("\n");
};
