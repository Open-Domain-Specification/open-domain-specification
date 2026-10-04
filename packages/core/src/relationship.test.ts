import { describe, expect, it } from "vitest";
import {
	counterpartOf,
	isSymmetricRelationship,
	relationshipArrow,
	relationshipTitle,
	strategicPositionOf,
	withAgreementName,
} from "./relationship";
import { Workspace } from "./workspace";

function makeWs() {
	const ws = new Workspace("WS", {
		description: "",
		version: "test",
	});
	const subdomain = ws
		.addDomain("Shop", { description: "" })
		.addSubdomain("Selling", { type: "core", description: "" });
	const catalog = subdomain.addBoundedcontext("Catalog", { description: "" });
	const sales = subdomain.addBoundedcontext("Sales", { description: "" });
	return { ws, catalog, sales };
}

describe("isSymmetricRelationship", () => {
	it("is true for the three relationship types with no upstream or downstream side", () => {
		expect(isSymmetricRelationship("partnership")).toBe(true);
		expect(isSymmetricRelationship("shared-kernel")).toBe(true);
		expect(isSymmetricRelationship("separate-ways")).toBe(true);
	});

	it("is false for directed relationship types", () => {
		expect(isSymmetricRelationship("upstream-downstream")).toBe(false);
		expect(isSymmetricRelationship("customer-supplier")).toBe(false);
	});
});

describe("relationshipTitle", () => {
	it("uses a directed arrow for an upstream/downstream relationship", () => {
		const { catalog, sales } = makeWs();
		const r = catalog.upstreamOf(sales, {});
		expect(relationshipTitle(r)).toBe("Catalog → Sales");
	});

	it("uses a double arrow for a symmetric relationship", () => {
		const { ws, catalog, sales } = makeWs();
		const r = ws.addRelationship({
			type: "separate-ways",
			participants: [catalog, sales],
		});
		expect(relationshipTitle(r)).toBe("Catalog ↔ Sales");
	});

	it("adds a named agreement's name, so two agreements between one pair read apart (#74)", () => {
		const { catalog, sales } = makeWs();
		const feed = catalog.upstreamOf(sales, { name: "price feed" });
		const lookup = catalog.upstreamOf(sales, { name: "price lookup" });
		expect(relationshipTitle(feed)).toBe("Catalog → Sales · price feed");
		expect(relationshipTitle(lookup)).toBe("Catalog → Sales · price lookup");
	});

	it("reads a blank name as no name", () => {
		const { catalog, sales } = makeWs();
		const r = catalog.upstreamOf(sales, {});
		r.name = "";
		expect(relationshipTitle(r)).toBe("Catalog → Sales");
	});
});

describe("relationshipArrow", () => {
	it("is a directed arrow for a directed type and a double arrow for a symmetric one", () => {
		expect(relationshipArrow("upstream-downstream")).toBe("→");
		expect(relationshipArrow("customer-supplier")).toBe("→");
		expect(relationshipArrow("partnership")).toBe("↔");
		expect(relationshipArrow("shared-kernel")).toBe("↔");
		expect(relationshipArrow("separate-ways")).toBe("↔");
	});

	it("is the arrow relationshipTitle puts between the two contexts", () => {
		const { ws, catalog, sales } = makeWs();
		const directed = catalog.upstreamOf(sales, {});
		const symmetric = ws.addRelationship({
			type: "partnership",
			participants: [catalog, sales],
		});
		for (const r of [directed, symmetric]) {
			expect(relationshipTitle(r)).toBe(
				`Catalog ${relationshipArrow(r.type)} Sales`,
			);
		}
	});
});

describe("withAgreementName", () => {
	it("puts a name after the middle dot and leaves an unnamed label alone", () => {
		expect(withAgreementName("upstream-downstream", "price feed")).toBe(
			"upstream-downstream · price feed",
		);
		expect(withAgreementName("upstream-downstream")).toBe(
			"upstream-downstream",
		);
		expect(withAgreementName("upstream-downstream", "")).toBe(
			"upstream-downstream",
		);
	});
});

describe("counterpartOf", () => {
	it("returns the context on the other side, whichever end it is", () => {
		const { catalog, sales } = makeWs();
		const r = catalog.upstreamOf(sales, {});
		expect(counterpartOf(r, catalog)).toBe(sales);
		expect(counterpartOf(r, sales)).toBe(catalog);
	});
});

describe("strategicPositionOf", () => {
	function threeContexts() {
		const { ws, catalog, sales } = makeWs();
		const billing = ws
			.addDomain("Money", { description: "" })
			.addSubdomain("Billing", { type: "core", description: "" })
			.addBoundedcontext("Billing", { description: "" });
		return { ws, catalog, sales, billing };
	}

	it("groups by direction in the order depends-on, depended-on-by, works-alongside", () => {
		const { ws, catalog, sales, billing } = threeContexts();
		const alongside = ws.addRelationship({
			type: "partnership",
			participants: [sales, catalog],
		});
		const dependedOnBy = sales.upstreamOf(billing, {});
		const dependsOn = catalog.upstreamOf(sales, {});
		const position = strategicPositionOf(sales, [
			alongside,
			dependedOnBy,
			dependsOn,
		]);
		expect(
			position.groups.map((g) => [g.id, g.label, g.relationships]),
		).toEqual([
			["depends-on", "Depends on", [dependsOn]],
			["depended-on-by", "Depended on by", [dependedOnBy]],
			["works-alongside", "Works alongside", [alongside]],
		]);
		expect(position.relationships).toEqual([
			alongside,
			dependedOnBy,
			dependsOn,
		]);
	});

	it("routes a symmetric relationship to works-alongside from either end", () => {
		const { ws, catalog, sales } = makeWs();
		const r = ws.addRelationship({
			type: "shared-kernel",
			participants: [catalog, sales],
		});
		for (const bc of [catalog, sales]) {
			const { groups } = strategicPositionOf(bc, [r]);
			expect(groups.map((g) => g.id)).toEqual(["works-alongside"]);
		}
	});

	it("leaves out empty groups and relationships that do not touch the context", () => {
		const { catalog, sales, billing } = threeContexts();
		const touching = catalog.upstreamOf(sales, {});
		const elsewhere = sales.upstreamOf(billing, {});
		const position = strategicPositionOf(catalog, [elsewhere, touching]);
		expect(position.relationships).toEqual([touching]);
		expect(position.groups.map((g) => g.id)).toEqual(["depended-on-by"]);
		expect(strategicPositionOf(billing, [touching]).groups).toEqual([]);
	});

	it("keeps input order inside a group and every occurrence of a repeated relationship", () => {
		const { catalog, sales, billing } = threeContexts();
		const a = sales.upstreamOf(catalog, {});
		const b = billing.upstreamOf(catalog, {});
		const { groups } = strategicPositionOf(catalog, [b, a, b]);
		expect(groups).toHaveLength(1);
		expect(groups[0].relationships).toEqual([b, a, b]);
		expect(groups[0].relationships[2]).toBe(b);
	});
});
