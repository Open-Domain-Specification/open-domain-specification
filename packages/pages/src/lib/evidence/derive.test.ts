import { Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import {
	counterpartOf,
	crossingConsumables,
	dispositionOf,
	health,
	positionGroups,
	relationshipLinks,
} from "./derive";
import {
	type FactSheetIndex,
	petstoreEvidence,
	relationshipKey,
	strategicPositionFixture,
} from "./fixtures";

const petstore = () => petstoreEvidence();

describe("dispositionOf", () => {
	it("defaults to by-design for a missing sheet and for a sheet that does not say", () => {
		expect(dispositionOf(undefined)).toBe("by-design");
		expect(dispositionOf({ facts: [] })).toBe("by-design");
		expect(dispositionOf({ facts: [], disposition: "refactor" })).toBe(
			"refactor",
		);
	});
});

describe("positionGroups", () => {
	it("splits a context's relationships into what it depends on, what depends on it and what it works alongside", () => {
		const { model, sheets, context } = petstore();
		const groups = positionGroups(
			context,
			model.workspace.relationships,
			sheets,
		);
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

	it("carries each row's sheet and leaves it undefined when the overlay has none", () => {
		const { model, sheets, context } = petstore();
		const rows = positionGroups(
			context,
			model.workspace.relationships,
			sheets,
		).flatMap((g) => g.rows);
		expect(rows.map((r) => r.sheet?.disposition)).toContain("by-design");
		expect(rows.some((r) => r.sheet === undefined)).toBe(true);
		expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
	});

	it("drops empty groups and ignores relationships the context is not part of", () => {
		const { model, sheets, context } = strategicPositionFixture(1);
		const groups = positionGroups(
			context,
			model.workspace.relationships,
			sheets,
		);
		expect(groups.map((g) => g.label)).toEqual(["Depends on"]);
		const other = model.workspace.boundedcontexts.get("pricing")!;
		expect(
			positionGroups(other, model.workspace.relationships, sheets),
		).toHaveLength(1);
	});
});

describe("counterpartOf", () => {
	it("returns the context on the other side, whichever end it is", () => {
		const { model, context } = petstore();
		const r = model.workspace.relationships.find(
			(r) => r.type === "customer-supplier",
		)!;
		expect(counterpartOf(r, context).id).toBe("catalog_bc");
		expect(counterpartOf(r, r.source)).toBe(r.target);
	});
});

describe("health", () => {
	it("reads the petstore overlay into refactor, tolerated and no-facts", () => {
		const { model, sheets } = petstore();
		const report = health(model.workspace, sheets);
		expect(report.refactor).toHaveLength(1);
		expect(report.refactor[0].context.id).toBe("catalog_bc");
		expect(report.refactor[0].rows[0].relationship.type).toBe("shared-kernel");
		expect(report.tolerated.map((r) => r.relationship.type)).toEqual([
			"upstream-downstream",
		]);
		// Sales–Fulfilment has an empty sheet, Identity–Sales has none at all.
		expect(report.noFacts.map((r) => r.relationship.type).sort()).toEqual([
			"partnership",
			"separate-ways",
		]);
	});

	it("groups several refactor rows under the context that owns the change", () => {
		const { model, sheets } = strategicPositionFixture(8);
		const report = health(model.workspace, sheets);
		const rows = report.refactor.flatMap((g) => g.rows);
		expect(rows).toHaveLength(2);
		expect(report.refactor.every((g) => g.rows.length >= 1)).toBe(true);
		expect(report.tolerated).toHaveLength(2);
		// Search has a sheet with no facts, Notifications has no sheet at all.
		expect(report.noFacts).toHaveLength(2);
	});

	it("reports nothing when every intent is by design and has a fact", () => {
		const workspace = new Workspace("Clean", {
			id: "clean",
			odsVersion: "1.0.0",
			description: "One well-evidenced relationship.",
			version: "0.0.1",
		});
		const a = workspace.addBoundedContext("A", { description: "A." });
		const b = workspace.addBoundedContext("B", { description: "B." });
		const r = a.upstreamOf(b, { description: "Plain." });
		const sheets: FactSheetIndex = {
			[relationshipKey(r)]: {
				disposition: "by-design",
				facts: [{ text: "It is what it looks like." }],
			},
		};
		const report = health(workspace, sheets);
		expect(report).toEqual({ refactor: [], tolerated: [], noFacts: [] });
	});
});

describe("crossingConsumables", () => {
	it("finds the consumables that actually cross the boundary, in both directions", () => {
		const { model, sheets } = petstore();
		const r = model.workspace.relationships.find(
			(r) => r.type === "customer-supplier",
		)!;
		const crossings = crossingConsumables(r, model.workspace, sheets);
		expect(crossings.map((c) => c.consumable.id).sort()).toEqual([
			"get_pet_summary",
			"mark_pet_sold",
			"reserve_pet",
		]);
		expect(
			crossings.find((c) => c.consumable.id === "reserve_pet")?.sheet
				?.disposition,
		).toBe("refactor");
		expect(
			crossings.find((c) => c.consumable.id === "mark_pet_sold")?.sheet,
		).toBeUndefined();
	});

	it("finds nothing for a boundary nothing crosses, and ignores traffic between other contexts", () => {
		const { model, sheets } = petstore();
		const separate = model.workspace.relationships.find(
			(r) => r.type === "separate-ways",
		)!;
		expect(crossingConsumables(separate, model.workspace, sheets)).toEqual([]);
		const kernel = model.workspace.relationships.find(
			(r) => r.type === "shared-kernel",
		)!;
		// Catalog–Inventory does carry traffic; Sales' consumptions are not it.
		const ids = crossingConsumables(kernel, model.workspace, sheets).map(
			(c) => c.consumable.id,
		);
		expect(ids).toContain("pet_registered");
		expect(ids).not.toContain("order_approved");
	});
});

describe("relationshipLinks", () => {
	it("merges the relationship's links with its crossings', deduplicates and puts decisions first", () => {
		const { model, sheets } = petstore();
		const r = model.workspace.relationships.find(
			(r) => r.type === "customer-supplier",
		)!;
		const crossings = crossingConsumables(r, model.workspace, sheets);
		const links = relationshipLinks(sheets[relationshipKey(r)], crossings);
		expect(links[0].kind).toBe("adr");
		expect(new Set(links.map((l) => l.url)).size).toBe(links.length);
		expect(links.map((l) => l.kind)).toEqual(
			expect.arrayContaining(["code", "contract"]),
		);
	});

	it("is empty when neither the relationship nor its crossings link anywhere", () => {
		expect(relationshipLinks(undefined, [])).toEqual([]);
		expect(
			relationshipLinks({ facts: [{ text: "No citation." }] }, []),
		).toEqual([]);
	});
});
