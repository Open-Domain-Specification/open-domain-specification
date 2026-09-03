import type {
	BoundedContext,
	Consumable,
	Consumption,
	ContextRelationship,
	Workspace,
} from "@open-domain-specification/core";
import { isSymmetricRelationship } from "../flow/graph";
import {
	type Disposition,
	type CommentLink,
	type CommentSheet,
	type CommentSheetIndex,
	relationshipKey,
	sheetForRef,
	sheetForRelationship,
} from "./fixtures";

/** One relationship with whatever the fixture overlay says about it. */
export type EvidenceRow = {
	/** Stable per row, so an expanded row survives a re-render. */
	key: string;
	relationship: ContextRelationship;
	sheet?: CommentSheet;
};

/** A named block of rows: one of the three strategic-position groups. */
export type RowGroup = { id: string; label: string; rows: EvidenceRow[] };

/** The disposition a sheet claims, defaulting to by-design when unset. */
export const dispositionOf = (sheet?: CommentSheet): Disposition =>
	sheet?.disposition ?? "by-design";

/** A relationship the reader can act on: it is either marked or unexplained. */
const hasNoFacts = (sheet?: CommentSheet) =>
	!sheet || sheet.comments.length === 0;

/** The context on the other side of a relationship from `bc`. */
export const counterpartOf = (
	r: ContextRelationship,
	bc: BoundedContext,
): BoundedContext => (r.source === bc ? r.target : r.source);

const row = (
	r: ContextRelationship,
	sheets: CommentSheetIndex,
	index: number,
): EvidenceRow => ({
	// Indexed as well as keyed: two contexts can hold more than one
	// relationship, and a row still needs an identity of its own.
	key: `${index}:${relationshipKey(r)}`,
	relationship: r,
	sheet: sheetForRelationship(sheets, r),
});

/**
 * The relationships of `bc`, grouped by what they mean from its point of
 * view: the contexts it depends on (it is downstream), the contexts that
 * depend on it (it is upstream), and the contexts it merely works alongside
 * (a symmetric type, where neither side is upstream). Empty groups are left
 * out so a context with one relationship shows one heading.
 */
export function positionGroups(
	bc: BoundedContext,
	relationships: ContextRelationship[],
	sheets: CommentSheetIndex,
): RowGroup[] {
	const mine = relationships.filter((r) => r.source === bc || r.target === bc);
	const rows = mine.map((r, i) => row(r, sheets, i));
	const groups: RowGroup[] = [
		{
			id: "depends-on",
			label: "Depends on",
			rows: rows.filter(
				(x) =>
					!isSymmetricRelationship(x.relationship.type) &&
					x.relationship.target === bc,
			),
		},
		{
			id: "depended-on-by",
			label: "Depended on by",
			rows: rows.filter(
				(x) =>
					!isSymmetricRelationship(x.relationship.type) &&
					x.relationship.source === bc,
			),
		},
		{
			id: "works-alongside",
			label: "Works alongside",
			rows: rows.filter((x) => isSymmetricRelationship(x.relationship.type)),
		},
	];
	return groups.filter((g) => g.rows.length > 0);
}

/** Refactor rows grouped by the context that owns the change. */
export type HealthGroup = { context: BoundedContext; rows: EvidenceRow[] };

/** What the health report reads: everything the architecture is not happy with. */
export type Health = {
	refactor: HealthGroup[];
	tolerated: EvidenceRow[];
	noFacts: EvidenceRow[];
};

/**
 * The workspace-level read of the overlay (RFC-002 section 4.5): what is
 * marked for refactoring, what is a tolerated compromise, and what carries no
 * comments at all. Refactor rows group by `source`, which for a directed
 * relationship is the upstream context and for a symmetric one is the first
 * participant — in both cases the side a reader goes to first.
 */
export function health(
	workspace: Workspace,
	sheets: CommentSheetIndex,
): Health {
	const rows = workspace.relationships.map((r, i) => row(r, sheets, i));
	const groups = new Map<BoundedContext, EvidenceRow[]>();
	for (const x of rows.filter((x) => dispositionOf(x.sheet) === "refactor")) {
		const into = groups.get(x.relationship.source) ?? [];
		into.push(x);
		groups.set(x.relationship.source, into);
	}
	return {
		refactor: [...groups].map(([context, rows]) => ({ context, rows })),
		tolerated: rows.filter((x) => dispositionOf(x.sheet) === "tolerated"),
		noFacts: rows.filter((x) => hasNoFacts(x.sheet)),
	};
}

/** A consumable that crosses the boundary a relationship describes. */
export type Crossing = {
	consumable: Consumable;
	consumption: Consumption;
	sheet?: CommentSheet;
};

const contextOf = (owner: { boundedcontext: BoundedContext }) =>
	owner.boundedcontext;

/**
 * The consumables that actually cross the boundary this relationship
 * describes: provided by one of its two contexts and consumed by the other,
 * in either direction. This is the concrete traffic behind the strategic
 * claim, so an empty list is itself informative.
 */
export function crossingConsumables(
	r: ContextRelationship,
	workspace: Workspace,
	sheets: CommentSheetIndex,
): Crossing[] {
	const sides = [r.source, r.target];
	const crossings: Crossing[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		for (const owner of [...bc.aggregates.values(), ...bc.services.values()]) {
			for (const consumption of owner.consumptions) {
				const from = contextOf(consumption.consumable.provider);
				const to = contextOf(owner);
				if (from === to) continue;
				if (!sides.includes(from) || !sides.includes(to)) continue;
				crossings.push({
					consumable: consumption.consumable,
					consumption,
					sheet: sheetForRef(sheets, consumption.consumable.ref),
				});
			}
		}
	}
	return crossings;
}

/**
 * Every link a relationship's evidence carries, its own and its crossing
 * consumables', deduplicated by url and with decisions first — a reader
 * chasing "why is this here" wants the ADR before the source file.
 */
export function relationshipLinks(
	sheet: CommentSheet | undefined,
	crossings: Crossing[],
): CommentLink[] {
	const sheets = [sheet, ...crossings.map((c) => c.sheet)];
	const byUrl = new Map<string, CommentLink>();
	for (const s of sheets)
		for (const f of s?.comments ?? [])
			if (f.link && !byUrl.has(f.link.url)) byUrl.set(f.link.url, f.link);
	return [...byUrl.values()].sort(
		(a, b) => Number(b.kind === "adr") - Number(a.kind === "adr"),
	);
}
