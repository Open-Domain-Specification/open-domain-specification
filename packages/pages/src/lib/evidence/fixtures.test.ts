import { dispositionOf, PATTERNS } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { strategicPositionFixture } from "./fixtures";

describe("strategicPositionFixture", () => {
	it("builds a hub with exactly the requested number of relationships", () => {
		for (const n of [1, 3, 8]) {
			const { model, context } = strategicPositionFixture(n);
			expect(model.workspace.relationships).toHaveLength(n);
			expect(model.fileLabel).toBe("density.json");
			for (const r of model.workspace.relationships)
				expect([r.source, r.target]).toContain(context);
		}
	});

	it("covers every disposition, and one relationship nobody wrote about, at eight", () => {
		const { model } = strategicPositionFixture(8);
		expect(new Set(model.workspace.relationships.map(dispositionOf))).toEqual(
			new Set(["by-design", "tolerated", "refactor"]),
		);
		expect(
			model.workspace.relationships.filter((r) => r.comments.length === 0),
		).toHaveLength(2);
	});

	it("puts one relationship in each group by the third counterpart", () => {
		const { model, context } = strategicPositionFixture(3);
		const types = model.workspace.relationships.map((r) => r.type);
		expect(types).toEqual([
			"customer-supplier",
			"upstream-downstream",
			"shared-kernel",
		]);
		// The hub is downstream of the first and upstream of the second.
		expect(model.workspace.relationships[0].target).toBe(context);
		expect(model.workspace.relationships[1].source).toBe(context);
	});

	it("uses only patterns core's knowledge base can summarise", () => {
		const { model } = strategicPositionFixture(8);
		for (const r of model.workspace.relationships) {
			expect(PATTERNS[r.type].summary, r.type).toBeTruthy();
			for (const role of [...r.upstreamRoles, ...r.downstreamRoles])
				expect(PATTERNS[role].summary, role).toBeTruthy();
		}
	});
});
