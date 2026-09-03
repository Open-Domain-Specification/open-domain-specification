import {
	type BoundedContext,
	type CommentLink,
	type Consumable,
	type Consumption,
	type ContextRelationship,
	dispositionOf,
	type Evidenced,
	isSymmetricRelationship,
	relationshipsWithoutComments,
	type Workspace,
} from "@open-domain-specification/core";

/** One relationship, with a key of its own so an expanded row survives a re-render. */
export type EvidenceRow = { key: string; relationship: ContextRelationship };

/** A named block of rows: one of the three strategic-position groups. */
export type RowGroup = { id: string; label: string; rows: EvidenceRow[] };

/**
 * Whether an intent has anything the evidence surfaces can disclose:
 * something written down, or a disposition other than the by-design default.
 */
export const hasEvidence = (intent: Evidenced): boolean =>
	intent.comments.length > 0 || dispositionOf(intent) !== "by-design";

/** The context on the other side of a relationship from `bc`. */
export const counterpartOf = (
	r: ContextRelationship,
	bc: BoundedContext,
): BoundedContext => (r.source === bc ? r.target : r.source);

const row = (r: ContextRelationship, index: number): EvidenceRow => ({
	// Indexed as well as referenced: a workspace loaded from a hand-edited file
	// can hold the same relationship twice, and a row still needs an identity.
	key: `${index}:${r.ref}`,
	relationship: r,
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
): RowGroup[] {
	const mine = relationships.filter((r) => r.source === bc || r.target === bc);
	const rows = mine.map(row);
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
	noComments: EvidenceRow[];
};

/** The three numbers the summary strip, the workspace node and the tree all show. */
export type HealthCounts = {
	refactor: number;
	tolerated: number;
	noComments: number;
};

/** The counts behind a report, flattened out of its groups. */
export function healthCounts(report: Health): HealthCounts {
	return {
		refactor: report.refactor.reduce((n, g) => n + g.rows.length, 0),
		tolerated: report.tolerated.length,
		noComments: report.noComments.length,
	};
}

/**
 * The three counts for a workspace. The workspace page's Health section, the
 * report's summary strip and the extension's workspace tree node all read
 * this, so none of them can drift from another.
 */
export const healthCountsOf = (workspace: Workspace): HealthCounts =>
	healthCounts(health(workspace));

/**
 * The workspace-level read of the evidence layer (RFC-002 section 4.5): what
 * is marked for refactoring, what is a tolerated compromise, and what carries
 * no comments at all. Refactor rows group by `source`, which for a directed
 * relationship is the upstream context and for a symmetric one is the first
 * participant — in both cases the side a reader goes to first.
 *
 * All three lists read relationships only, matching core's
 * `relationshipsWithoutComments` and the `comments-required` rule, so the
 * number on the page, the number on the tree node and the number of warnings
 * in the Problems panel are the same number.
 */
export function health(workspace: Workspace): Health {
	const rows = workspace.relationships.map(row);
	const bare = new Set<ContextRelationship>(
		relationshipsWithoutComments(workspace),
	);
	const groups = new Map<BoundedContext, EvidenceRow[]>();
	for (const x of rows.filter(
		(x) => dispositionOf(x.relationship) === "refactor",
	)) {
		const into = groups.get(x.relationship.source) ?? [];
		into.push(x);
		groups.set(x.relationship.source, into);
	}
	return {
		refactor: [...groups].map(([context, rows]) => ({ context, rows })),
		tolerated: rows.filter(
			(x) => dispositionOf(x.relationship) === "tolerated",
		),
		noComments: rows.filter((x) => bare.has(x.relationship)),
	};
}

/** A consumable that crosses the boundary a relationship describes. */
export type Crossing = { consumable: Consumable; consumption: Consumption };

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
				crossings.push({ consumable: consumption.consumable, consumption });
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
	r: ContextRelationship,
	crossings: Crossing[],
): CommentLink[] {
	const sources = [r, ...crossings.map((c) => c.consumable)];
	const byUrl = new Map<string, CommentLink>();
	for (const source of sources)
		for (const comment of source.comments)
			if (comment.link && !byUrl.has(comment.link.url))
				byUrl.set(comment.link.url, comment.link);
	return [...byUrl.values()].sort(
		(a, b) => Number(b.kind === "adr") - Number(a.kind === "adr"),
	);
}
