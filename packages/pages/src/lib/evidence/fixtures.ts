import {
	type BoundedContext,
	type ContextRelationship,
	Workspace,
} from "@open-domain-specification/core";
import { petstoreModel } from "../fixtures";
import type { Model } from "../model";

/**
 * Provisional evidence types for the RFC-002 Storybook designs.
 *
 * These live here, and only here, on purpose: RFC-002 section 6 leaves the
 * schema open until these surfaces have been reviewed. The only importers are
 * the evidence surfaces themselves — `atoms/DispositionChip.svelte`,
 * `molecules/CommentList.svelte`, `organisms/StrategicPositionTable.svelte`,
 * `organisms/RelationshipDetail.svelte`, `organisms/HealthReport.svelte` and
 * the components under `evidence/` — and no shipped template renders any of
 * those, so nothing a reader can reach today depends on this shape.
 *
 * A comments is a flat list of grounded statements, each optionally backed
 * by one link, plus at most one disposition. There is deliberately no
 * lifecycle: no dates, no verified-by, no derived confidence.
 */
export type CommentLinkKind =
	| "code"
	| "contract"
	| "adr"
	| "runbook"
	| "dashboard";

export type CommentLink = {
	kind: CommentLinkKind;
	url: string;
	label?: string;
};

export type Comment = { text: string; link?: CommentLink };

export type Disposition = "by-design" | "tolerated" | "refactor";

export type CommentSheet = { comments: Comment[]; disposition?: Disposition };

/**
 * Comment sheets by key. A relationship is keyed by {@link relationshipKey}
 * because `ContextRelationship` carries no id of its own; everything else is
 * keyed by its `ref`, which every other model element already has.
 */
export type CommentSheetIndex = Record<string, CommentSheet>;

/**
 * A relationship's fixture key. Derived rather than stored: RFC-002 section 6
 * has not decided where evidence lives, so nothing here should look like a
 * schema commitment.
 */
export const relationshipKey = (r: ContextRelationship): string =>
	`${r.source.id}~${r.type}~${r.target.id}`;

/** The comments for a relationship, if the index has one. */
export const sheetForRelationship = (
	sheets: CommentSheetIndex,
	r: ContextRelationship,
): CommentSheet | undefined => sheets[relationshipKey(r)];

/** The comments for any other element, by its ref. */
export const sheetForRef = (
	sheets: CommentSheetIndex,
	ref: string,
): CommentSheet | undefined => sheets[ref];

/** What each disposition claims, for the chip's tooltip. */
export const DISPOSITION_SUMMARIES: Record<Disposition, string> = {
	"by-design": "This is how the architecture should be.",
	tolerated: "A known compromise, not planned to change. The comments say why.",
	refactor:
		"Should be removed or replaced. The comments say what it should become.",
};

/** Human wording for a disposition chip. */
export const DISPOSITION_LABELS: Record<Disposition, string> = {
	"by-design": "by design",
	tolerated: "tolerated",
	refactor: "refactor",
};

/** How a comment's link kind is worded next to the statement. */
export const LINK_KIND_LABELS: Record<CommentLinkKind, string> = {
	code: "code",
	contract: "contract",
	adr: "decision",
	runbook: "runbook",
	dashboard: "dashboard",
};

/**
 * The overlay for the petstore example. Four of its five relationships carry
 * a sheet; Identity–Sales deliberately carries none, so every surface has to
 * cope with the absent case. Two Catalog consumables carry sheets of their
 * own so the relationship detail's consumable list has dispositions to show.
 */
export const PETSTORE_SHEETS: CommentSheetIndex = {
	"catalog_bc~customer-supplier~sales_bc": {
		disposition: "by-design",
		comments: [
			{
				text: "Sales reads Catalog through PetSummaryClient, which maps the catalog payload onto the Sales order model.",
				link: {
					kind: "code",
					url: "https://github.com/example/petstore/blob/main/sales/acl/PetSummaryClient.ts",
					label: "sales/acl/PetSummaryClient.ts",
				},
			},
			{
				text: "The summary contract is versioned and published; Catalog will not break it without a major release.",
				link: {
					kind: "contract",
					url: "https://github.com/example/petstore/blob/main/catalog/openapi.yaml",
					label: "catalog/openapi.yaml",
				},
			},
		],
	},
	"sales_bc~upstream-downstream~inventory_bc": {
		disposition: "tolerated",
		comments: [
			{
				text: "The projection conforms to the Sales order events rather than translating them; accepted while Inventory stays read-only.",
				link: {
					kind: "code",
					url: "https://github.com/example/petstore/blob/main/inventory/projection/OrderEventHandler.ts",
					label: "inventory/projection/OrderEventHandler.ts",
				},
			},
		],
	},
	"catalog_bc~shared-kernel~inventory_bc": {
		disposition: "refactor",
		comments: [
			{
				text: "PetStatus and its values live in @petstore/kernel and both services compile against it.",
				link: {
					kind: "code",
					url: "https://github.com/example/petstore/blob/main/packages/kernel/src/PetStatus.ts",
					label: "packages/kernel/src/PetStatus.ts",
				},
			},
			{
				text: "The kernel has grown past the status enum and now carries pricing rules; it should become a Published Language from Catalog.",
				link: {
					kind: "adr",
					url: "https://github.com/example/petstore/blob/main/docs/adr/014-shrink-the-kernel.md",
					label: "ADR-014 Shrink the kernel",
				},
			},
		],
	},
	"sales_bc~partnership~fulfilment_bc": {
		disposition: "by-design",
		comments: [],
	},
	// Identity–Sales has no entry at all: separate ways, nobody has written
	// anything down, and the health report has to notice that.
	"#/boundedcontexts/catalog_bc/services/pet_app/provides/get_pet_summary": {
		disposition: "by-design",
		comments: [
			{
				text: "The summary projection is the only Catalog read Sales is allowed to make.",
				link: {
					kind: "contract",
					url: "https://github.com/example/petstore/blob/main/catalog/openapi.yaml#/paths/~1pets~1{id}~1summary",
					label: "GET /pets/{id}/summary",
				},
			},
		],
	},
	"#/boundedcontexts/catalog_bc/aggregates/pet/provides/reserve_pet": {
		disposition: "refactor",
		comments: [
			{
				text: "Reservation is a synchronous call into the Catalog aggregate; it should become an order-placed subscription so Sales stops blocking on Catalog.",
				link: {
					kind: "adr",
					url: "https://github.com/example/petstore/blob/main/docs/adr/017-reserve-asynchronously.md",
					label: "ADR-017 Reserve asynchronously",
				},
			},
		],
	},
};

/** The petstore model with its evidence overlay, for the stories. */
export function petstoreEvidence(): {
	model: Model;
	sheets: CommentSheetIndex;
	context: BoundedContext;
} {
	const model = petstoreModel();
	return {
		model,
		sheets: PETSTORE_SHEETS,
		// Sales touches all four of the other contexts, so it is the context
		// whose strategic position exercises every group.
		context: model.workspace.boundedcontexts.get("sales_bc") as BoundedContext,
	};
}

/**
 * One counterpart of the synthetic density fixture: which side of the hub it
 * sits on, how it relates, and what the hub's authors have written about it.
 * Ordered so the first is one "Depends on" row, the first three cover all
 * three groups, and all eight cover every relationship type and disposition
 * including the no-sheet case.
 */
type CounterpartFixture = {
	name: string;
	side: "upstream" | "downstream" | "alongside";
	type: ContextRelationship["type"];
	upstreamRoles: ContextRelationship["upstreamRoles"];
	downstreamRoles: ContextRelationship["downstreamRoles"];
	description: string;
	sheet?: CommentSheet;
};

const comment = (text: string, kind?: CommentLinkKind): Comment =>
	kind
		? { text, link: { kind, url: `https://example.com/${kind}`, label: kind } }
		: { text };

const COUNTERPARTS: CounterpartFixture[] = [
	{
		name: "Pricing",
		side: "upstream",
		type: "customer-supplier",
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["anti-corruption-layer"],
		description: "Prices are quoted by Pricing and translated on the way in.",
		sheet: {
			disposition: "by-design",
			comments: [
				comment("PriceQuoteClient translates quotes at the boundary.", "code"),
				comment("The quote contract is versioned and published.", "contract"),
			],
		},
	},
	{
		name: "Reporting",
		side: "downstream",
		type: "upstream-downstream",
		upstreamRoles: ["published-language"],
		downstreamRoles: ["conformist"],
		description: "Reporting reads the hub's events exactly as published.",
		sheet: {
			disposition: "tolerated",
			comments: [
				comment("Reporting is read-only, so conforming is cheap.", "adr"),
			],
		},
	},
	{
		name: "Ledger",
		side: "alongside",
		type: "shared-kernel",
		upstreamRoles: [],
		downstreamRoles: [],
		description: "Money types are one shared definition.",
		sheet: {
			disposition: "refactor",
			comments: [
				comment(
					"The kernel now carries rounding rules as well as types.",
					"code",
				),
				comment("It should become a Published Language from Ledger.", "adr"),
			],
		},
	},
	{
		name: "Notifications",
		side: "downstream",
		type: "upstream-downstream",
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["conformist"],
		description:
			"Notifications react to hub events; nobody has written down why.",
	},
	{
		name: "Search",
		side: "downstream",
		type: "customer-supplier",
		// The one shape with two roles on each side, so a dense row shows how
		// several abbreviations sit together.
		upstreamRoles: ["open-host-service", "published-language"],
		downstreamRoles: ["anti-corruption-layer", "conformist"],
		description: "Search indexes the hub's published language.",
		sheet: { disposition: "by-design", comments: [] },
	},
	{
		name: "Fulfilment",
		side: "alongside",
		type: "partnership",
		upstreamRoles: [],
		downstreamRoles: [],
		description: "Both lifecycles are designed and released together.",
		sheet: {
			disposition: "by-design",
			comments: [comment("One release train covers both services.", "runbook")],
		},
	},
	{
		name: "Legacy Billing",
		side: "alongside",
		type: "separate-ways",
		upstreamRoles: [],
		downstreamRoles: [],
		description: "No integration; billing is reconciled by hand each month.",
		sheet: {
			disposition: "tolerated",
			// Deliberately unlinked: a comment is worth recording even with nothing to cite.
			comments: [
				comment("Billing is reconciled by hand at the end of each month."),
			],
		},
	},
	{
		name: "Identity",
		side: "upstream",
		type: "upstream-downstream",
		upstreamRoles: ["published-language"],
		downstreamRoles: ["anti-corruption-layer"],
		description:
			"Identity claims are translated into the hub's own actor model.",
		sheet: {
			disposition: "refactor",
			comments: [
				comment("The translator duplicates Identity's token parsing.", "code"),
			],
		},
	},
];

/**
 * A synthetic workspace whose hub context has exactly `count` relationships,
 * for the density stories. Built with the builder API so every ref is correct
 * by construction, and capped at the shapes above.
 */
export function strategicPositionFixture(count: number): {
	model: Model;
	sheets: CommentSheetIndex;
	context: BoundedContext;
} {
	const workspace = new Workspace("Density", {
		id: "density",
		odsVersion: "1.0.0",
		description:
			"Synthetic workspace for the strategic position density stories.",
		version: "0.0.1",
	});
	const hub = workspace.addBoundedContext("Hub", {
		description: "The context whose strategic position the story shows.",
	});
	const sheets: CommentSheetIndex = {};
	for (const counterpart of COUNTERPARTS.slice(0, count)) {
		const other = workspace.addBoundedContext(counterpart.name, {
			description: `${counterpart.name} as seen from Hub.`,
		});
		const relationship =
			counterpart.side === "alongside"
				? workspace.addRelationship({
						type: counterpart.type as "partnership",
						participants: [hub, other],
						description: counterpart.description,
					})
				: workspace.addRelationship({
						type: counterpart.type as "upstream-downstream",
						upstream: counterpart.side === "upstream" ? other : hub,
						downstream: counterpart.side === "upstream" ? hub : other,
						upstreamRoles: counterpart.upstreamRoles,
						downstreamRoles: counterpart.downstreamRoles,
						description: counterpart.description,
					});
		if (counterpart.sheet)
			sheets[relationshipKey(relationship)] = counterpart.sheet;
	}
	return {
		model: {
			workspace,
			fileLabel: "density.json",
			diagnostics: workspace.validate(),
		},
		sheets,
		context: hub,
	};
}
