import {
	consumptionRef,
	encodeRefSegment,
	relationshipRef,
} from "@open-domain-specification/core";
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

	it("preserves empty segments and rejects malformed escapes", () => {
		expect(refToPath("#/boundedcontexts/")).toEqual(["boundedcontexts", ""]);
		expect(refToPath("#/boundedcontexts/a~01b")).toEqual([
			"boundedcontexts",
			"a~1b",
		]);
		expect(refToPath("#/boundedcontexts/a~2b")).toBeUndefined();
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

	it("locates adversarial raw JSON keys from their canonical segments", () => {
		const ids = [
			"a/b",
			"a~1b",
			"%2F",
			"returns",
			"",
			"é",
			".",
			"a\\b",
			"Case",
			"\ud800",
		];
		const file = JSON.stringify({
			name: "Shop",
			boundedcontexts: Object.fromEntries(
				ids.map((id) => [id, { name: `Context ${id}` }]),
			),
		});
		for (const id of ids) {
			const span = locateRef(file, `#/boundedcontexts/${encodeRefSegment(id)}`);
			expect(JSON.parse(file.slice(span.start, span.end))).toBe(id);
		}
	});
});

describe("locateRef on a relationship", () => {
	const at = (ref: string) => {
		const span = locateRef(text, ref);
		return text.slice(span.start, span.end);
	};

	it("finds the directed relationship by its source, type and target", () => {
		const found = at(relationshipRef("catalog", "customer-supplier", "orders"));
		expect(found).toContain('"customer-supplier"');
		expect(found.startsWith("{")).toBe(true);
		expect(found).not.toContain("partnership");
	});

	it("finds the symmetric one by its participants, in the order the ref uses", () => {
		expect(at(relationshipRef("orders", "partnership", "shipping"))).toContain(
			'"partnership"',
		);
	});

	it("falls back to the array when the triple matches nothing in it", () => {
		// Right pair, wrong type; wrong pair; reversed participants.
		for (const ref of [
			relationshipRef("catalog", "partnership", "orders"),
			relationshipRef("catalog", "customer-supplier", "shipping"),
			relationshipRef("shipping", "partnership", "orders"),
		])
			expect(at(ref)).toBe('"relationships"');
	});

	it("ignores an element whose ends are missing, rather than matching on type alone", () => {
		const broken = JSON.stringify(
			{ name: "Shop", relationships: [{ type: "partnership" }] },
			null,
			2,
		);
		const span = locateRef(broken, relationshipRef("a", "partnership", "b"));
		expect(broken.slice(span.start, span.end)).toBe('"relationships"');
	});

	it("falls back to the workspace name when the file has no relationships at all", () => {
		const none = JSON.stringify({ name: "Shop" }, null, 2);
		const span = locateRef(none, relationshipRef("a", "partnership", "b"));
		expect(none.slice(span.start, span.end)).toBe('"name"');
	});

	it("matches encoded ends and the normalized name of a named relationship", () => {
		const named = JSON.stringify(
			{
				name: "Shop",
				relationships: [
					{
						type: "partnership",
						name: "Legacy Feed",
						participants: [
							{ $ref: "#/boundedcontexts/a~1b" },
							{ $ref: "#/boundedcontexts/a~01b" },
						],
					},
				],
			},
			null,
			2,
		);
		const span = locateRef(
			named,
			relationshipRef("a/b", "partnership", "a~1b", "legacy_feed"),
		);
		expect(named.slice(span.start, span.end)).toContain('"Legacy Feed"');
	});
});

describe("locateRef on a consumption", () => {
	const consumer = {
		name: "Order App",
		consumes: [
			{
				consumable: {
					$ref: "#/boundedcontexts/catalog/services/pet_app/provides/get_pet",
				},
				pattern: "conformist",
			},
			{
				consumable: {
					$ref: "#/boundedcontexts/catalog/aggregates/pet/provides/pet_sold",
				},
			},
		],
	};
	const file = JSON.stringify(
		{
			name: "Shop",
			boundedcontexts: { orders: { services: { order_app: consumer } } },
		},
		null,
		2,
	);
	const at = (ref: string) => {
		const span = locateRef(file, ref);
		return file.slice(span.start, span.end);
	};
	const CONSUMER = "#/boundedcontexts/orders/services/order_app";

	it("finds the element of consumes[] whose consumable the ref names", () => {
		const found = at(
			consumptionRef(
				CONSUMER,
				"#/boundedcontexts/catalog/services/pet_app/provides/get_pet",
			),
		);
		expect(found.startsWith("{")).toBe(true);
		expect(found).toContain("get_pet");
		expect(found).not.toContain("pet_sold");
	});

	it("tells two consumptions of the same consumer apart", () => {
		expect(
			at(
				consumptionRef(
					CONSUMER,
					"#/boundedcontexts/catalog/aggregates/pet/provides/pet_sold",
				),
			),
		).toContain("pet_sold");
	});

	it("matches exact encoded full target and caller refs", () => {
		const target = "#/boundedcontexts/a~1b/services/%2F/provides/a~01b";
		const caller =
			"#/boundedcontexts/orders/services/order_app/provides/returns";
		const exact = JSON.stringify(
			{
				name: "Shop",
				boundedcontexts: {
					orders: {
						services: {
							order_app: {
								name: "Order App",
								consumes: [
									{
										consumable: { $ref: target },
										by: [{ $ref: caller }],
									},
								],
							},
						},
					},
				},
			},
			null,
			2,
		);
		const span = locateRef(exact, consumptionRef(CONSUMER, target, caller));
		expect(exact.slice(span.start, span.end)).toContain("a~01b");
	});

	it("falls back to the array when nothing in it matches", () => {
		expect(
			at(
				consumptionRef(
					CONSUMER,
					"#/boundedcontexts/catalog/services/x/provides/y",
				),
			),
		).toBe('"consumes"');
	});

	it("falls back to the consumer when it consumes nothing at all", () => {
		const none = JSON.stringify(
			{
				name: "Shop",
				boundedcontexts: { orders: { services: { order_app: { name: "A" } } } },
			},
			null,
			2,
		);
		const span = locateRef(
			none,
			consumptionRef(
				CONSUMER,
				"#/boundedcontexts/catalog/services/pet_app/provides/get_pet",
			),
		);
		expect(none.slice(span.start, span.end)).toBe('"order_app"');
	});

	/**
	 * One consumer taking one consumable twice: the ref of each carries the id
	 * of the first caller in `by`, and that is the only thing telling the two
	 * elements of `consumes[]` apart (card 89).
	 */
	describe("when the consumer takes one consumable twice", () => {
		const twice = JSON.stringify(
			{
				name: "Shop",
				boundedcontexts: {
					orders: {
						services: {
							order_app: {
								name: "Order App",
								consumes: [
									{
										consumable: {
											$ref: "#/boundedcontexts/catalog/services/pet_app/provides/get_pet",
										},
										pattern: "conformist",
										by: [
											{
												$ref: "#/boundedcontexts/orders/services/order_app/provides/archive",
											},
										],
									},
									{
										consumable: {
											$ref: "#/boundedcontexts/catalog/services/pet_app/provides/get_pet",
										},
										pattern: "anti-corruption-layer",
										by: [{ $ref: "#/boundedcontexts/orders/policies/decide" }],
									},
								],
							},
						},
					},
				},
			},
			null,
			2,
		);
		const target =
			"#/boundedcontexts/catalog/services/pet_app/provides/get_pet";
		const atTwice = (ref: string) => {
			const span = locateRef(twice, ref);
			return twice.slice(span.start, span.end);
		};

		it("picks the element whose first caller the ref names", () => {
			expect(
				atTwice(
					consumptionRef(
						CONSUMER,
						target,
						"#/boundedcontexts/orders/services/order_app/provides/archive",
					),
				),
			).toContain("conformist");
			expect(
				atTwice(
					consumptionRef(
						CONSUMER,
						target,
						"#/boundedcontexts/orders/policies/decide",
					),
				),
			).toContain("anti-corruption-layer");
		});

		it("falls back to the array when no element names that caller", () => {
			expect(
				atTwice(
					consumptionRef(
						CONSUMER,
						target,
						"#/boundedcontexts/orders/policies/nobody",
					),
				),
			).toBe('"consumes"');
		});
	});
});
