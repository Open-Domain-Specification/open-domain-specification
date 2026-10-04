import {
	type BoundedContext,
	type ContextRelationship,
	Workspace,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { petstoreSales } from "../fixtures";
import {
	counterpartOf,
	crossingConsumables,
	hasEvidence,
	health,
	healthCounts,
	healthCountsOf,
	positionGroups,
	relationshipLinks,
} from "./derive";
import { strategicPositionFixture } from "./fixtures";

const ofType = (
	model: { workspace: Workspace },
	type: string,
): ContextRelationship =>
	model.workspace.relationships.find(
		(r) => r.type === type,
	) as ContextRelationship;

describe("hasEvidence", () => {
	it("is true for anything written down or marked, false for a silent by-design intent", () => {
		const { model } = petstoreSales();
		// Catalog → Sales is by design but carries comments.
		expect(hasEvidence(ofType(model, "customer-supplier"))).toBe(true);
		// Sales → Inventory is tolerated.
		expect(hasEvidence(ofType(model, "upstream-downstream"))).toBe(true);
		// Sales ↔ Fulfilment: by design, but the comments still count as evidence.
		expect(hasEvidence(ofType(model, "partnership"))).toBe(true);
		// A relationship with nothing said and nothing marked discloses nothing.
		const workspace = new Workspace("Silent", {
			id: "silent",
			description: "One by-design relationship, nothing written down.",
			version: "0.0.1",
		});
		const a = workspace.addBoundedContext("A", { description: "A." });
		const b = workspace.addBoundedContext("B", { description: "B." });
		expect(hasEvidence(a.upstreamOf(b))).toBe(false);
	});
});

describe("positionGroups", () => {
	it("splits a context's relationships into what it depends on, what depends on it and what it works alongside", () => {
		const { model, context } = petstoreSales();
		const groups = positionGroups(context, model.workspace.relationships);
		expect(groups.map((g) => g.id)).toEqual([
			"depends-on",
			"depended-on-by",
			"works-alongside",
		]);
		// Sales is downstream of Catalog, upstream of Inventory, and alongside
		// Fulfilment and Identity.
		expect(groups[0].rows).toHaveLength(1);
		expect(groups[0].rows[0].relationship.source.id).toBe("catalog_bc");
		expect(groups[1].rows[0].relationship.target.id).toBe("inventory_bc");
		expect(groups[2].rows).toHaveLength(2);
	});

	it("keys every row uniquely so an expanded row survives a re-render", () => {
		const { model, context } = petstoreSales();
		const rows = positionGroups(context, model.workspace.relationships).flatMap(
			(g) => g.rows,
		);
		expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
		for (const row of rows)
			expect(row.key.endsWith(row.relationship.ref)).toBe(true);
	});

	it("drops empty groups and ignores relationships the context is not part of", () => {
		const { model, context } = strategicPositionFixture(1);
		const groups = positionGroups(context, model.workspace.relationships);
		expect(groups.map((g) => g.label)).toEqual(["Depends on"]);
		const other = model.workspace.boundedcontexts.get(
			"pricing",
		) as BoundedContext;
		expect(positionGroups(other, model.workspace.relationships)).toHaveLength(
			1,
		);
	});
});

describe("counterpartOf", () => {
	it("returns the context on the other side, whichever end it is", () => {
		const { model, context } = petstoreSales();
		const r = ofType(model, "customer-supplier");
		expect(counterpartOf(r, context).id).toBe("catalog_bc");
		expect(counterpartOf(r, r.source)).toBe(r.target);
	});
});

describe("health", () => {
	it("reads the petstore into refactor, tolerated and no-comments", () => {
		const { model } = petstoreSales();
		const report = health(model.workspace);
		expect(report.refactor).toHaveLength(1);
		expect(report.refactor[0].context.id).toBe("catalog_bc");
		expect(report.refactor[0].rows[0].relationship.type).toBe("shared-kernel");
		expect(report.tolerated.map((r) => r.relationship.type)).toEqual([
			"upstream-downstream",
		]);
		// Petstore turns comments-required on, so every relationship is explained.
		expect(report.noComments).toEqual([]);
	});

	it("groups several refactor rows under the context that owns the change", () => {
		const { model } = strategicPositionFixture(8);
		const report = health(model.workspace);
		expect(report.refactor.flatMap((g) => g.rows)).toHaveLength(2);
		expect(report.refactor.every((g) => g.rows.length >= 1)).toBe(true);
		expect(report.tolerated).toHaveLength(2);
		// Search carries a disposition but no comment, Notifications neither.
		expect(report.noComments).toHaveLength(2);
	});

	it("reports nothing when every intent is by design and has a comment", () => {
		const workspace = new Workspace("Clean", {
			id: "clean",
			description: "One well-evidenced relationship.",
			version: "0.0.1",
		});
		const a = workspace.addBoundedContext("A", { description: "A." });
		const b = workspace.addBoundedContext("B", { description: "B." });
		a.upstreamOf(b, {
			description: "Plain.",
			disposition: "by-design",
			comments: [{ text: "It is what it looks like." }],
		});
		expect(health(workspace)).toEqual({
			refactor: [],
			tolerated: [],
			noComments: [],
		});
	});
});

describe("healthCounts", () => {
	it("flattens the refactor groups so the strip and the tree node agree", () => {
		const { model } = strategicPositionFixture(8);
		const report = health(model.workspace);
		// Two refactor rows spread across two groups count as two, not as two groups.
		expect(report.refactor.length).toBeGreaterThan(1);
		expect(healthCounts(report)).toEqual({
			refactor: 2,
			tolerated: 2,
			noComments: 2,
		});
	});

	it("reads a workspace straight through, which is what every host calls", () => {
		const { model } = petstoreSales();
		expect(healthCountsOf(model.workspace)).toEqual({
			refactor: 1,
			tolerated: 1,
			noComments: 0,
		});
	});

	it("is all zeroes for a workspace with no relationships", () => {
		const workspace = new Workspace("Bare", {
			id: "bare",
			description: "Nothing related to anything.",
			version: "0.0.1",
		});
		expect(healthCountsOf(workspace)).toEqual({
			refactor: 0,
			tolerated: 0,
			noComments: 0,
		});
	});
});

describe("crossingConsumables", () => {
	it("finds the consumables that actually cross the boundary, in both directions", () => {
		const { model } = petstoreSales();
		const crossings = crossingConsumables(
			ofType(model, "customer-supplier"),
			model.workspace,
		);
		expect(crossings.map((c) => c.consumable.id).sort()).toEqual([
			"get_pet_summary",
			"mark_pet_sold_for_order",
			// The relisting Sales waits on is a consumption like the rest of them
			// since card 90; a subscription crosses the boundary either way.
			"pet_status_changed",
			"reserve_pet_for_order",
		]);
		expect(
			crossings.find((c) => c.consumable.id === "reserve_pet_for_order")
				?.consumable.disposition,
		).toBe("refactor");
		expect(
			crossings.find((c) => c.consumable.id === "mark_pet_sold_for_order")
				?.consumable.comments,
		).toEqual([]);
	});

	it("finds nothing for a boundary nothing crosses, and ignores traffic between other contexts", () => {
		const { model } = petstoreSales();
		expect(
			crossingConsumables(ofType(model, "separate-ways"), model.workspace),
		).toEqual([]);
		// Catalog–Inventory does carry traffic; Sales' consumptions are not it.
		const ids = crossingConsumables(
			ofType(model, "shared-kernel"),
			model.workspace,
		).map((c) => c.consumable.id);
		expect(ids).toContain("pet_registered");
		expect(ids).not.toContain("order_approved");
	});
});

describe("relationshipLinks", () => {
	it("merges the relationship's links with its crossings', deduplicates and puts decisions first", () => {
		const { model } = petstoreSales();
		const r = ofType(model, "customer-supplier");
		const links = relationshipLinks(r, crossingConsumables(r, model.workspace));
		expect(links[0].kind).toBe("adr");
		expect(new Set(links.map((l) => l.url)).size).toBe(links.length);
		expect(links.map((l) => l.kind)).toEqual(
			expect.arrayContaining(["code", "contract"]),
		);
	});

	it("is empty when neither the relationship nor its crossings link anywhere", () => {
		const { model } = petstoreSales();
		expect(relationshipLinks(ofType(model, "partnership"), [])).toEqual([]);
		const workspace = new Workspace("Bare", {
			id: "bare",
			description: "One uncited comment.",
			version: "0.0.1",
		});
		const a = workspace.addBoundedContext("A", { description: "A." });
		const b = workspace.addBoundedContext("B", { description: "B." });
		const uncited = a.upstreamOf(b, {
			comments: [{ text: "No citation." }],
		});
		expect(relationshipLinks(uncited, [])).toEqual([]);
	});
});
