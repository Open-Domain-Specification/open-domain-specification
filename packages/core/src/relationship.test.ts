import { describe, expect, it } from "vitest";
import {
	isSymmetricRelationship,
	relationshipArrow,
	relationshipTitle,
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
