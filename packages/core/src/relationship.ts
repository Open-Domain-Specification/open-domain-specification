import type { BoundedContext, ContextRelationship } from "./workspace";

/**
 * What every surface needs to know about a relationship before it draws one.
 *
 * This is deliberately a leaf module: the diagrams, the organisms, the
 * templates, the extension's search and tree, and the doc generator all read
 * it.
 */

const SYMMETRIC = new Set(["partnership", "shared-kernel", "separate-ways"]);

/** Relationship types with no upstream or downstream side. */
export const isSymmetricRelationship = (type: string) => SYMMETRIC.has(type);

/**
 * The glyph between a relationship's two contexts: an arrow when one side
 * leads, a double arrow when neither does. Every surface that draws the two
 * contexts as separate parts (each its own link) composes its label from this
 * one, so the glyph is written once.
 */
export const relationshipArrow = (type: string): string =>
	isSymmetricRelationship(type) ? "↔" : "→";

/**
 * What stands between a relationship's two contexts and its agreement name,
 * wherever a surface draws the two apart (a page heading, a table cell) and
 * must still read as `relationshipTitle` does.
 */
export const RELATIONSHIP_NAME_SEPARATOR = " · ";

/**
 * A relationship's label with a named agreement's name after the middle dot,
 * or the label alone when it has none: the title's two contexts, or a type
 * where a table cell stands for the relationship.
 */
export const withAgreementName = (label: string, name?: string): string =>
	name ? `${label}${RELATIONSHIP_NAME_SEPARATOR}${name}` : label;

/**
 * How a relationship is named wherever it is listed: its own page, the health
 * report, the search spotlight, the extension tree and generated Markdown. It
 * is named by its two contexts and the direction between them, an arrow when
 * one side leads and a double arrow when neither does. One pair may hold two
 * agreements (decision 15), and each then carries a name, so a named agreement
 * adds it after a middle dot, as the context map's stereotype badge does:
 * "Vendor → Warehouse · purchase feed". A pair's only agreement needs no name
 * and reads as the pair alone.
 */
export const relationshipTitle = (r: ContextRelationship): string =>
	withAgreementName(
		`${r.source.name} ${relationshipArrow(r.type)} ${r.target.name}`,
		r.name,
	);

/** The context on the other side of a relationship from `bc`. */
export const counterpartOf = (
	r: ContextRelationship,
	bc: BoundedContext,
): BoundedContext => (r.source === bc ? r.target : r.source);

/** A named block of one context's relationships: one of the three strategic-position groups. */
export type PositionGroup = {
	id: "depends-on" | "depended-on-by" | "works-alongside";
	label: "Depends on" | "Depended on by" | "Works alongside";
	relationships: ContextRelationship[];
};

/** A context's relationships and the groups they fall into. */
export type StrategicPosition = {
	/** Every relationship that touches the context, in input order. */
	relationships: ContextRelationship[];
	/** The non-empty groups, in the order depends-on, depended-on-by, works-alongside. */
	groups: PositionGroup[];
};

/**
 * The relationships of `bc`, grouped by what they mean from its point of
 * view: the contexts it depends on (it is downstream), the contexts that
 * depend on it (it is upstream), and the contexts it merely works alongside
 * (a symmetric type, where neither side is upstream). Empty groups are left
 * out so a context with one relationship shows one heading, and inside a
 * group the relationships keep the order they were given in.
 */
export function strategicPositionOf(
	bc: BoundedContext,
	relationships: ReadonlyArray<ContextRelationship>,
): StrategicPosition {
	const mine = relationships.filter((r) => r.source === bc || r.target === bc);
	const groups: PositionGroup[] = [
		{
			id: "depends-on",
			label: "Depends on",
			relationships: mine.filter(
				(r) => !isSymmetricRelationship(r.type) && r.target === bc,
			),
		},
		{
			id: "depended-on-by",
			label: "Depended on by",
			relationships: mine.filter(
				(r) => !isSymmetricRelationship(r.type) && r.source === bc,
			),
		},
		{
			id: "works-alongside",
			label: "Works alongside",
			relationships: mine.filter((r) => isSymmetricRelationship(r.type)),
		},
	];
	return {
		relationships: mine,
		groups: groups.filter((g) => g.relationships.length > 0),
	};
}
