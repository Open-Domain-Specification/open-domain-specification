import { describe, expect, it } from "vitest";
import { locateRef, refToPath } from "./locate";

const text = JSON.stringify(
	{
		name: "Shop",
		boundedcontexts: {
			orders: { name: "Orders", aggregates: { order: { name: "Order" } } },
		},
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
