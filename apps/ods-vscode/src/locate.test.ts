import {
	consumptionRef,
	encodeRefSegment,
	qualifiedRelationshipRef,
	relationshipRef,
} from "@open-domain-specification/core";
import { findNodeAtLocation, parseTree } from "jsonc-parser";
import { describe, expect, it } from "vitest";
import { assemble } from "./assemble";
import { jsonPathOfRef, locateRef, refToPath, valueAtPath } from "./locate";
import { teamTexts } from "./writer.support";

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

describe("relationships with an end in another file", () => {
	const doc = {
		name: "B",
		boundedcontexts: {
			claims: {
				name: "Claims",
				aggregates: {
					account: {
						consumes: [
							{
								consumable: {
									$ref: "a.json#/boundedcontexts/ledger/services/p/provides/post",
								},
							},
						],
					},
				},
			},
		},
		relationships: [
			{
				type: "upstream-downstream",
				upstream: { $ref: "../a/team.json#/boundedcontexts/ledger" },
				downstream: { $ref: "#/boundedcontexts/claims" },
			},
			{
				type: "upstream-downstream",
				upstream: { $ref: "#/boundedcontexts/ledger" },
				downstream: { $ref: "#/boundedcontexts/claims" },
			},
			{ type: "partnership", participants: [3, { $ref: "x" }] },
			{
				type: "partnership",
				participants: [{ $ref: "no-pointer" }, { $ref: "#/other/thing/x" }],
			},
		],
	};
	const crossRef = qualifiedRelationshipRef(
		{ path: "../a/team.json", id: "ledger" },
		"upstream-downstream",
		{ path: ".", id: "claims" },
	);
	const localRef = relationshipRef("ledger", "upstream-downstream", "claims");
	const text = JSON.stringify(doc, null, 2);

	it("finds the element by the seven segment ref, with each end's file compared", () => {
		expect(jsonPathOfRef(doc, crossRef)).toEqual(["relationships", 0]);
		const { start } = locateRef(text, crossRef);
		expect(text.slice(start, start + 1)).toBe("{");
		expect(
			text
				.slice(start)
				.startsWith(
					'{\n      "type": "upstream-downstream",\n      "upstream": {\n        "$ref": "../a/team.json',
				),
		).toBe(true);
	});

	it("does not take a same-named local pair for the foreign one, nor the reverse", () => {
		expect(jsonPathOfRef(doc, localRef)).toEqual(["relationships", 1]);
		const other = qualifiedRelationshipRef(
			{ path: "elsewhere.json", id: "ledger" },
			"upstream-downstream",
			{ path: ".", id: "claims" },
		);
		expect(jsonPathOfRef(doc, other)).toBeUndefined();
	});
});

describe("jsonPathOfRef", () => {
	const doc = {
		a: { b: [10, 20] },
		boundedcontexts: {
			x: {
				aggregates: {
					y: {
						consumes: [
							{
								consumable: {
									$ref: "#/boundedcontexts/z/services/s/provides/p",
								},
								by: [{ $ref: "#/c" }],
							},
						],
					},
				},
			},
		},
		relationships: "not a list",
	};
	const consumer = "#/boundedcontexts/x/aggregates/y";

	it("addresses the workspace, object paths and array elements", () => {
		expect(jsonPathOfRef(doc, "#")).toEqual([]);
		expect(jsonPathOfRef(doc, "#/a/b")).toEqual(["a", "b"]);
		expect(jsonPathOfRef(doc, "#/a/missing")).toBeUndefined();
		expect(jsonPathOfRef(doc, "not a ref")).toBeUndefined();
		expect(valueAtPath(doc, ["a", "b", 1])).toBe(20);
		expect(valueAtPath(doc, ["a", "b", "length"])).toBeUndefined();
		expect(valueAtPath(doc, ["a", 0])).toBeUndefined();
		expect(valueAtPath(null, ["a"])).toBeUndefined();
	});

	it("finds a consumption by consumable and, when the ref has one, by caller", () => {
		const plain = consumptionRef(
			consumer,
			"#/boundedcontexts/z/services/s/provides/p",
		);
		const by = consumptionRef(
			consumer,
			"#/boundedcontexts/z/services/s/provides/p",
			"#/c",
		);
		expect(jsonPathOfRef(doc, plain)).toEqual([
			...(refToPath(consumer) as string[]),
			"consumes",
			0,
		]);
		expect(jsonPathOfRef(doc, by)).toEqual([
			...(refToPath(consumer) as string[]),
			"consumes",
			0,
		]);
		expect(
			jsonPathOfRef(
				doc,
				consumptionRef(
					consumer,
					"#/boundedcontexts/z/services/s/provides/other",
				),
			),
		).toBeUndefined();
		expect(
			jsonPathOfRef(
				doc,
				consumptionRef("#/boundedcontexts/missing/aggregates/y", "#/q"),
			),
		).toBeUndefined();
	});

	it("is undefined for a relationship when the file has no list of them", () => {
		expect(
			jsonPathOfRef(doc, relationshipRef("a", "partnership", "b")),
		).toBeUndefined();
	});
});

/**
 * The whole path from a file's text to the diagnostic the Problems panel
 * shows: core's own assembled findings of `sub/b.json`, whose refs are
 * canonical however the file spelled the link to `\u00e9.json` (which core's
 * wire form writes `%C3%A9.json`), then the range the locator gives each.
 */
describe("a link written in any spelling the resolver accepts is found at its own element", () => {
	const OWNER = "sub/b.json";
	const FOREIGN = "\u00e9.json";
	const spellings = [
		"../%C3%A9.json",
		"./../%C3%A9.json",
		".././%C3%A9.json",
		"%2E%2E/%C3%A9.json",
		"../%c3%a9.json",
		"./%2e%2E/%c3%A9.json",
	];
	const consumable = "/boundedcontexts/ledger/services/payments/provides/post";

	function build(spelling: string) {
		const texts = teamTexts();
		const doc = JSON.parse(texts["b.json"]);
		const rel = {
			...doc.relationships[0],
			upstream: { $ref: `${spelling}#/boundedcontexts/ledger` },
		};
		// Twice, so core reports relationship-duplicate on this relationship.
		doc.relationships = [rel, JSON.parse(JSON.stringify(rel))];
		doc.boundedcontexts.claims.aggregates.account.consumes = [
			{ consumable: { $ref: `${spelling}#${consumable}` } },
		];
		const text = JSON.stringify(doc, null, 2);
		const assembled = assemble([
			{ file: FOREIGN, text: texts["a.json"] },
			{ file: OWNER, text },
			{ file: "c.json", text: texts["c.json"] },
		]);
		const found = assembled.diagnostics.get(OWNER) ?? [];
		return { text, found };
	}
	const spanOfNode = (text: string, path: (string | number)[]) => {
		const node = findNodeAtLocation(parseTree(text) as never, path);
		return {
			start: node?.offset,
			end: (node?.offset ?? 0) + (node?.length ?? 0),
		};
	};
	/** Where the locator lands when it finds no element: the property's key. */
	const keySpan = (text: string, path: (string | number)[]) => {
		const key = findNodeAtLocation(parseTree(text) as never, path)?.parent
			?.children?.[0];
		return { start: key?.offset, end: (key?.offset ?? 0) + (key?.length ?? 0) };
	};
	const CONSUMES = [
		"boundedcontexts",
		"claims",
		"aggregates",
		"account",
		"consumes",
	];

	it.each(spellings)(
		"%s: relationship and consumption findings sit on their element",
		(spelling) => {
			const { text, found } = build(spelling);
			const relationship = found.filter(
				(d) => d.rule === "relationship-duplicate",
			);
			const consumption = found.filter(
				(d) => d.rule === "consumption-by-required",
			);
			expect(relationship).toHaveLength(1);
			expect(consumption).toHaveLength(1);
			// Core wrote the canonical identity, whatever the file wrote.
			expect(relationship[0].ref).toBe(
				qualifiedRelationshipRef(
					{ path: "../%C3%A9.json", id: "ledger" },
					"upstream-downstream",
					{ path: ".", id: "claims" },
				),
			);
			expect(locateRef(text, relationship[0].ref, OWNER)).toEqual(
				spanOfNode(text, ["relationships", 0]),
			);
			expect(locateRef(text, consumption[0].ref, OWNER)).toEqual(
				spanOfNode(text, [...CONSUMES, 0]),
			);
			expect(
				jsonPathOfRef(JSON.parse(text), consumption[0].ref, OWNER),
			).toEqual([...CONSUMES, 0]);
			expect(
				jsonPathOfRef(JSON.parse(text), relationship[0].ref, OWNER),
			).toEqual(["relationships", 0]);
		},
	);

	it("a wrong-file control: a link to the same file name in another directory is another file", () => {
		const { text, found } = build("../%C3%A9.json");
		const doc = JSON.parse(text);
		const claims = "#/boundedcontexts/claims/aggregates/account";
		// Identities core would write for sub/\u00e9.json, which is not \u00e9.json.
		const near = consumptionRef(claims, `%C3%A9.json#${consumable}`);
		const relationship = qualifiedRelationshipRef(
			{ path: "%C3%A9.json", id: "ledger" },
			"upstream-downstream",
			{ path: ".", id: "claims" },
		);
		expect(locateRef(text, near, OWNER)).toEqual(keySpan(text, CONSUMES));
		expect(jsonPathOfRef(doc, near, OWNER)).toBeUndefined();
		expect(jsonPathOfRef(doc, relationship, OWNER)).toBeUndefined();
		// And the spelled-out far file is the one that matches.
		const far = consumptionRef(claims, `../%C3%A9.json#${consumable}`);
		expect(jsonPathOfRef(doc, far, OWNER)).toEqual([...CONSUMES, 0]);
		expect(found.length).toBeGreaterThan(0);
	});

	it("a local ref stays local: an equal id in this file is not the other file's element", () => {
		const { found } = build("../%C3%A9.json");
		const consumption = found.filter(
			(d) => d.rule === "consumption-by-required",
		)[0];
		const relationship = found.filter(
			(d) => d.rule === "relationship-duplicate",
		)[0];
		const local = {
			boundedcontexts: {
				claims: {
					aggregates: {
						account: { consumes: [{ consumable: { $ref: `#${consumable}` } }] },
					},
				},
			},
			relationships: [
				{
					type: "upstream-downstream",
					upstream: { $ref: "#/boundedcontexts/ledger" },
					downstream: { $ref: "#/boundedcontexts/claims" },
				},
			],
		};
		const text = JSON.stringify(local, null, 2);
		expect(locateRef(text, consumption.ref, OWNER)).toEqual(
			keySpan(text, CONSUMES),
		);
		expect(jsonPathOfRef(local, consumption.ref, OWNER)).toBeUndefined();
		expect(jsonPathOfRef(local, relationship.ref, OWNER)).toBeUndefined();
		// And the other way round: a link spelled to the owning file itself is local.
		const self = JSON.parse(JSON.stringify(local));
		self.boundedcontexts.claims.aggregates.account.consumes[0].consumable.$ref = `b.json#${consumable}`;
		const selfRef = consumptionRef(
			"#/boundedcontexts/claims/aggregates/account",
			`#${consumable}`,
		);
		expect(jsonPathOfRef(self, selfRef, "b.json")).toEqual([...CONSUMES, 0]);
		expect(jsonPathOfRef(self, selfRef, "other/c.json")).toBeUndefined();
	});

	it("does not match a written ref the resolver refuses, nor name a file that is not the owner's", () => {
		const { found } = build("../%C3%A9.json");
		const ref = found.filter((d) => d.rule === "consumption-by-required")[0]
			.ref;
		for (const bad of [
			"/abs.json",
			"%zz.json",
			"../../../x.json",
			"../%C3%A9.txt",
		]) {
			const doc = {
				boundedcontexts: {
					claims: {
						aggregates: {
							account: {
								consumes: [{ consumable: { $ref: `${bad}#${consumable}` } }],
							},
						},
					},
				},
			};
			expect(jsonPathOfRef(doc, ref, OWNER)).toBeUndefined();
		}
		// An element that names no consumable at all is not it either.
		const bare = {
			boundedcontexts: {
				claims: { aggregates: { account: { consumes: [{}] } } },
			},
		};
		expect(jsonPathOfRef(bare, ref, OWNER)).toBeUndefined();
	});

	it("keeps raw written values: matching never rewrites the text it returns a span of", () => {
		const { text, found } = build("./../%c3%a9.json");
		const ref = found.filter((d) => d.rule === "consumption-by-required")[0]
			.ref;
		const span = locateRef(text, ref, OWNER);
		expect(text.slice(span.start, span.end)).toContain("./../%c3%a9.json#");
	});
});
