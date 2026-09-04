import { describe, expect, it } from "vitest";
import { locateRef, refToPath } from "./locate";

const text = JSON.stringify(
	{
		name: "Shop",
		boundedcontexts: {
			orders: { name: "Orders", aggregates: { order: { name: "Order" } } },
		},
		relationships: [
			{
				type: "customer-supplier",
				upstream: { $ref: "#/boundedcontexts/catalog" },
				downstream: { $ref: "#/boundedcontexts/orders" },
			},
			{
				type: "partnership",
				participants: [
					{ $ref: "#/boundedcontexts/orders" },
					{ $ref: "#/boundedcontexts/shipping" },
				],
			},
		],
	},
	null,
	2,
);

describe("refToPath", () => {
	it("drops the fragment prefix and decodes pointer escapes", () => {
		expect(refToPath("#/boundedcontexts/a~1b/aggregates/c")).toEqual([
			"boundedcontexts",
			"a/b",
			"aggregates",
			"c",
		]);
		expect(refToPath("#")).toEqual([]);
	});
});

describe("locateRef", () => {
	it("returns the span of the element's key", () => {
		const span = locateRef(text, "#/boundedcontexts/orders/aggregates/order");
		expect(text.slice(span.start, span.end)).toBe('"order"');
	});

	it("falls back to the deepest existing ancestor", () => {
		const span = locateRef(text, "#/boundedcontexts/orders/aggregates/missing");
		expect(text.slice(span.start, span.end)).toBe('"aggregates"');
	});

	it("falls back to the workspace name, then the file start", () => {
		expect(
			text.slice(
				...(Object.values(locateRef(text, "#/teams/x")) as [number, number]),
			),
		).toBe('"name"');
		expect(locateRef("not json", "#/x")).toEqual({ start: 0, end: 0 });
	});
});

describe("locateRef on a relationship", () => {
	const at = (ref: string) => {
		const span = locateRef(text, ref);
		return text.slice(span.start, span.end);
	};

	it("finds the directed relationship by its source, type and target", () => {
		const found = at("#/relationships/catalog~customer-supplier~orders");
		expect(found).toContain('"customer-supplier"');
		expect(found.startsWith("{")).toBe(true);
		expect(found).not.toContain("partnership");
	});

	it("finds the symmetric one by its participants, in the order the ref uses", () => {
		expect(at("#/relationships/orders~partnership~shipping")).toContain(
			'"partnership"',
		);
	});

	it("falls back to the array when the triple matches nothing in it", () => {
		// Right pair, wrong type; wrong pair; reversed participants.
		for (const ref of [
			"#/relationships/catalog~partnership~orders",
			"#/relationships/catalog~customer-supplier~shipping",
			"#/relationships/shipping~partnership~orders",
		])
			expect(at(ref)).toBe('"relationships"');
	});

	it("ignores an element whose ends are missing, rather than matching on type alone", () => {
		const broken = JSON.stringify(
			{ name: "Shop", relationships: [{ type: "partnership" }] },
			null,
			2,
		);
		const span = locateRef(broken, "#/relationships/a~partnership~b");
		expect(broken.slice(span.start, span.end)).toBe('"relationships"');
	});

	it("falls back to the workspace name when the file has no relationships at all", () => {
		const none = JSON.stringify({ name: "Shop" }, null, 2);
		const span = locateRef(none, "#/relationships/a~partnership~b");
		expect(none.slice(span.start, span.end)).toBe('"name"');
	});
});
