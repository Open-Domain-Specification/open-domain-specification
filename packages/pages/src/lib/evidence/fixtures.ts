import {
	type BoundedContext,
	type Comment,
	type CommentLinkKind,
	type ContextRelationship,
	type Disposition,
	Workspace,
} from "@open-domain-specification/core";
import type { Model } from "../model";

/**
 * One counterpart of the synthetic density fixture: which side of the hub it
 * sits on, how it relates, and what the hub's authors have written about it.
 * Ordered so the first is one "Depends on" row, the first three cover all
 * three groups, and all eight cover every relationship type and disposition
 * including the one nobody has written anything about.
 */
type CounterpartFixture = {
	name: string;
	side: "upstream" | "downstream" | "alongside";
	type: ContextRelationship["type"];
	upstreamRoles: ContextRelationship["upstreamRoles"];
	downstreamRoles: ContextRelationship["downstreamRoles"];
	description: string;
	disposition?: Disposition;
	comments?: Comment[];
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
		disposition: "by-design",
		comments: [
			comment("PriceQuoteClient translates quotes at the boundary.", "code"),
			comment("The quote contract is versioned and published.", "contract"),
		],
	},
	{
		name: "Reporting",
		side: "downstream",
		type: "upstream-downstream",
		upstreamRoles: ["published-language"],
		downstreamRoles: ["conformist"],
		description: "Reporting reads the hub's events exactly as published.",
		disposition: "tolerated",
		comments: [
			comment("Reporting is read-only, so conforming is cheap.", "adr"),
		],
	},
	{
		name: "Ledger",
		side: "alongside",
		type: "shared-kernel",
		upstreamRoles: [],
		downstreamRoles: [],
		description: "Money types are one shared definition.",
		disposition: "refactor",
		comments: [
			comment(
				"The kernel now carries rounding rules as well as types.",
				"code",
			),
			comment("It should become a Published Language from Ledger.", "adr"),
		],
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
		disposition: "by-design",
	},
	{
		name: "Fulfilment",
		side: "alongside",
		type: "partnership",
		upstreamRoles: [],
		downstreamRoles: [],
		description: "Both lifecycles are designed and released together.",
		disposition: "by-design",
		comments: [comment("One release train covers both services.", "runbook")],
	},
	{
		name: "Legacy Billing",
		side: "alongside",
		type: "separate-ways",
		upstreamRoles: [],
		downstreamRoles: [],
		description: "No integration; billing is reconciled by hand each month.",
		disposition: "tolerated",
		// Deliberately unlinked: a comment is worth recording even with nothing to cite.
		comments: [
			comment("Billing is reconciled by hand at the end of each month."),
		],
	},
	{
		name: "Identity",
		side: "upstream",
		type: "upstream-downstream",
		upstreamRoles: ["published-language"],
		downstreamRoles: ["anti-corruption-layer"],
		description:
			"Identity claims are translated into the hub's own actor model.",
		disposition: "refactor",
		comments: [
			comment("The translator duplicates Identity's token parsing.", "code"),
		],
	},
];

/**
 * A synthetic workspace whose hub context has exactly `count` relationships,
 * for the density stories. Built with the builder API so every ref is correct
 * by construction, and capped at the shapes above.
 */
export function strategicPositionFixture(count: number): {
	model: Model;
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
	for (const counterpart of COUNTERPARTS.slice(0, count)) {
		const other = workspace.addBoundedContext(counterpart.name, {
			description: `${counterpart.name} as seen from Hub.`,
		});
		const evidence = {
			disposition: counterpart.disposition,
			comments: counterpart.comments,
		};
		if (counterpart.side === "alongside") {
			workspace.addRelationship({
				type: counterpart.type as "partnership",
				participants: [hub, other],
				description: counterpart.description,
				...evidence,
			});
		} else {
			workspace.addRelationship({
				type: counterpart.type as "upstream-downstream",
				upstream: counterpart.side === "upstream" ? other : hub,
				downstream: counterpart.side === "upstream" ? hub : other,
				upstreamRoles: counterpart.upstreamRoles,
				downstreamRoles: counterpart.downstreamRoles,
				description: counterpart.description,
				...evidence,
			});
		}
	}
	return {
		model: {
			workspace,
			fileLabel: "density.json",
			diagnostics: workspace.validate(),
		},
		context: hub,
	};
}
