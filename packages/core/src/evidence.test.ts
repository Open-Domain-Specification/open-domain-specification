import { describe, expect, it } from "vitest";
import {
	dispositionOf,
	intentsWithoutComments,
	relationshipsWithoutComments,
} from "./evidence";
import type { Comment } from "./schema";
import { type BoundedContext, type Consumable, Workspace } from "./workspace";

const KERNEL_COMMENTS: Comment[] = [
	{
		text: "PetStatus lives in @petstore/kernel and both services compile against it.",
		link: {
			kind: "code",
			url: "https://example.test/kernel/PetStatus.ts",
			label: "packages/kernel/src/PetStatus.ts",
		},
	},
	{ text: "The kernel has grown past the status enum." },
];

/**
 * Two contexts, one consumable and one consumption, so every kind of
 * strategic intent is present exactly once.
 */
function makeEvidenceWs(): {
	ws: Workspace;
	catalog: BoundedContext;
	sales: BoundedContext;
	summary: Consumable;
} {
	const ws = new Workspace("Petstore", {
		odsVersion: "1.0.0",
		description: "",
		version: "test",
	});
	const subdomain = ws
		.addDomain("Shop", { description: "" })
		.addSubdomain("Selling", { type: "core", description: "" });
	const catalog = subdomain.addBoundedcontext("Catalog BC", {
		description: "",
	});
	const sales = subdomain.addBoundedcontext("Sales BC", { description: "" });

	const catalogApp = catalog.addService("Pet App", {
		type: "application",
		description: "",
	});
	const summary = catalogApp.provides("Get Pet Summary", {
		description: "",
		type: "operation",
		pattern: "open-host-service",
		comments: [{ text: "The only Catalog read Sales may make." }],
	});
	sales
		.addAggregate("Order", { description: "" })
		.consumes(summary, { pattern: "anti-corruption-layer" });

	return { ws, catalog, sales, summary };
}

describe("dispositionOf", () => {
	it("reads back a disposition that was set", () => {
		const { catalog, sales } = makeEvidenceWs();
		const relationship = catalog.upstreamOf(sales, {
			disposition: "refactor",
			comments: KERNEL_COMMENTS,
		});
		expect(dispositionOf(relationship)).toBe("refactor");
	});

	it("answers by-design when nothing was said", () => {
		const { catalog, sales } = makeEvidenceWs();
		expect(dispositionOf(catalog.upstreamOf(sales))).toBe("by-design");
	});

	it("does not store by-design, so the DSL never writes it to JSON", () => {
		const { catalog, sales } = makeEvidenceWs();
		const relationship = catalog.upstreamOf(sales, {
			disposition: "by-design",
			comments: [{ text: "Deliberate." }],
		});
		expect(relationship.disposition).toBeUndefined();
		expect(dispositionOf(relationship)).toBe("by-design");
		expect(relationship.toSchema().disposition).toBeUndefined();
	});
});

describe("intentsWithoutComments", () => {
	it("lists every intent nobody has written anything down about", () => {
		const { ws, catalog, sales, summary } = makeEvidenceWs();
		catalog.upstreamOf(sales, { comments: [{ text: "Documented." }] });
		const undocumented = ws.addRelationship({
			type: "shared-kernel",
			participants: [catalog, sales],
		});

		const intents = intentsWithoutComments(ws);

		expect(intents).toContain(undocumented);
		expect(intents).not.toContain(summary);
		// The one consumption in the workspace carries no comments.
		expect(intents.filter((it) => "consumable" in it)).toHaveLength(1);
		expect(intents).toHaveLength(2);
	});

	it("leaves out internal consumables, which cross no boundary", () => {
		const { ws, catalog } = makeEvidenceWs();
		const internal = catalog.services.get("pet_app")?.provides("Pet Indexed", {
			description: "",
			type: "event",
			internal: true,
		});
		if (!internal) throw new Error("expected the internal consumable");

		expect(internal.comments).toEqual([]);
		expect(intentsWithoutComments(ws)).not.toContain(internal);
	});

	it("is empty once every intent carries a comment", () => {
		const { ws, catalog, sales } = makeEvidenceWs();
		catalog.upstreamOf(sales, { comments: [{ text: "Documented." }] });
		for (const consumption of sales.aggregates.get("order")?.consumptions ??
			[]) {
			consumption.comments.push({ text: "Documented too." });
		}
		expect(intentsWithoutComments(ws)).toEqual([]);
	});
});

describe("relationshipsWithoutComments", () => {
	it("lists the relationships nobody has written anything down about", () => {
		const { ws, catalog, sales } = makeEvidenceWs();
		catalog.upstreamOf(sales, { comments: [{ text: "Documented." }] });
		const undocumented = ws.addRelationship({
			type: "shared-kernel",
			participants: [catalog, sales],
		});

		expect(relationshipsWithoutComments(ws)).toEqual([undocumented]);
	});

	it("is narrower than intentsWithoutComments: the uncommented consumption is not a relationship", () => {
		const { ws, catalog, sales } = makeEvidenceWs();
		catalog.upstreamOf(sales, { comments: [{ text: "Documented." }] });

		// The one consumption carries no comments, so the wide reading sees it.
		expect(intentsWithoutComments(ws)).toHaveLength(1);
		expect(relationshipsWithoutComments(ws)).toEqual([]);
	});

	it("is empty for a workspace with no relationships at all", () => {
		const { ws } = makeEvidenceWs();
		expect(relationshipsWithoutComments(ws)).toEqual([]);
	});
});

describe("evidence round-trip", () => {
	it("survives toSchema/fromSchema on a directed relationship", () => {
		const { ws, catalog, sales } = makeEvidenceWs();
		catalog.upstreamOf(sales, {
			type: "customer-supplier",
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
			description: "Sales needs pet availability",
			disposition: "tolerated",
			comments: KERNEL_COMMENTS,
		});

		const schema = ws.toSchema();
		const rebuilt = Workspace.fromSchema(JSON.parse(JSON.stringify(schema)))
			.relationships[0];

		expect(rebuilt.disposition).toBe("tolerated");
		expect(rebuilt.comments).toEqual(KERNEL_COMMENTS);
		expect(Workspace.fromSchema(schema).toSchema()).toEqual(schema);
	});

	it("survives toSchema/fromSchema on a symmetric relationship", () => {
		const { ws, catalog, sales } = makeEvidenceWs();
		catalog.sharesKernelWith(sales, {
			description: "PetStatus is one shared definition",
			disposition: "refactor",
			comments: KERNEL_COMMENTS,
		});

		const rebuilt = Workspace.fromSchema(ws.toSchema()).relationships[0];

		expect(rebuilt.disposition).toBe("refactor");
		expect(rebuilt.comments).toEqual(KERNEL_COMMENTS);
		expect(rebuilt.description).toBe("PetStatus is one shared definition");
	});

	it("keeps the other symmetric helpers on the same options shape", () => {
		const { ws, catalog, sales } = makeEvidenceWs();
		const partnership = catalog.partnerOf(sales, {
			comments: [{ text: "Released together." }],
		});
		const separate = catalog.separateWaysFrom(sales, {
			description: "No integration by design",
		});

		expect(partnership.type).toBe("partnership");
		expect(partnership.comments).toHaveLength(1);
		expect(separate.description).toBe("No integration by design");
		expect(separate.comments).toEqual([]);
		expect(ws.relationships).toEqual([partnership, separate]);
	});

	it("survives toSchema/fromSchema on a consumable and a consumption", () => {
		const { ws, sales } = makeEvidenceWs();
		const consumption = sales.aggregates.get("order")?.consumptions[0];
		if (!consumption) throw new Error("expected a consumption");
		consumption.comments.push({ text: "The ACL is PetSummaryClient." });
		consumption.disposition = "tolerated";

		const rebuilt = Workspace.fromSchema(
			JSON.parse(JSON.stringify(ws.toSchema())),
		);

		expect(
			rebuilt.getConsumableByRefOrThrow(
				"#/boundedcontexts/catalog_bc/services/pet_app/provides/get_pet_summary",
			).comments,
		).toEqual([{ text: "The only Catalog read Sales may make." }]);
		const rebuiltConsumption = rebuilt.getAggregateByRefOrThrow(
			"#/boundedcontexts/sales_bc/aggregates/order",
		).consumptions[0];
		expect(rebuiltConsumption.disposition).toBe("tolerated");
		expect(rebuiltConsumption.comments).toEqual([
			{ text: "The ACL is PetSummaryClient." },
		]);
	});

	it("writes no comments key for an intent that has none", () => {
		const { ws, catalog, sales } = makeEvidenceWs();
		catalog.upstreamOf(sales);
		const [relationship] = JSON.parse(JSON.stringify(ws.toSchema()))
			.relationships as Record<string, unknown>[];
		expect(relationship).not.toHaveProperty("comments");
		expect(relationship).not.toHaveProperty("disposition");
	});
});
