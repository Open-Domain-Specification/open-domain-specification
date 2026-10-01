import { ODSRelationMap } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { relationMapToDigraph, relationMapToPlantUML } from "./relation-map";

const namespace = [
	{ id: "ws", name: "Shop" },
	{ id: "#/domains/sales", name: "Sales" },
	{ id: "#/domains/sales/subdomains/orders", name: "Orders" },
	{ id: "#/boundedcontexts/ordering", name: "Ordering" },
	{ id: "#/boundedcontexts/ordering/aggregates/order", name: "Order" },
];

function buildMap() {
	const map = new ODSRelationMap([]);
	const order = map.addNode({
		id: "#/boundedcontexts/ordering/aggregates/order/entities/order",
		name: "Order",
		description: "Order header",
		type: "entity_root",
		namespace,
		attributes: [
			{ name: "id", type: "OrderId", identity: true },
			{
				name: "placedAt",
				type: "Instant",
				identity: false,
				description: "When it was placed",
			},
		],
	});
	const line = map.addNode({
		id: "#/boundedcontexts/ordering/aggregates/order/entities/line",
		name: "Order Line",
		type: "entity",
		namespace,
		attributes: [],
	});
	const money = map.addNode({
		id: "#/boundedcontexts/ordering/aggregates/order/valueobjects/money",
		name: "Money",
		type: "valueobject",
		namespace,
		attributes: [{ name: "amount", type: "Decimal <2dp>", identity: false }],
	});
	map.addEdge({
		source: order,
		target: line,
		label: "lines",
		relation: "includes",
		cardinality: "1..*",
	});
	map.addEdge({
		source: order,
		target: money,
		label: "totals",
		relation: "uses",
	});
	return map;
}

describe("relationMapToDigraph", () => {
	it("draws a UML class diagram with one cluster per aggregate", () => {
		expect(relationMapToDigraph(buildMap()).toDot()).toMatchInlineSnapshot(`
			"digraph {
			  layout = "dot";
			  rankdir = "LR";
			  stylesheet = "data:text/css,.graph%20text%20%7B%0A%09font-family%3A%20sans-serif%3B%0A%09stroke%3A%20white%3B%0A%09paint-order%3A%20stroke%3B%0A%09stroke-width%3A%203%3B%0A%09stroke-linecap%3A%20square%3B%0A%7D%0A%0A.namespace%20polygon%20%7B%0A%09fill-opacity%3A%200.2%3B%0A%09stroke%3A%20none%3B%0A%7D%0A";
			  subgraph "#/boundedcontexts/ordering/aggregates/order" {
			    cluster = true;
			    class = "namespace";
			    label = "Sales / Orders / Ordering / Order";
			    style = "filled";
			    color = "lightgrey";
			    fontsize = 10;
			    fontname = "sans-serif";
			    "#/boundedcontexts/ordering/aggregates/order/entities/order" [
			      label = <<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4"><TR><TD ALIGN="CENTER">«root entity»<BR/><B>Order</B></TD></TR><TR><TD ALIGN="LEFT">{id} id: OrderId</TD></TR><TR><TD ALIGN="LEFT" TITLE="When it was placed">placedAt: Instant</TD></TR></TABLE>>;
			      shape = "plain";
			      tooltip = "Order header";
			      fillcolor = "white";
			      style = "filled";
			      fontname = "sans-serif";
			      fontsize = 10;
			    ];
			    "#/boundedcontexts/ordering/aggregates/order/entities/line" [
			      label = <<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4"><TR><TD ALIGN="CENTER">«entity»<BR/><B>Order Line</B></TD></TR><TR><TD ALIGN="LEFT"> </TD></TR></TABLE>>;
			      shape = "plain";
			      fillcolor = "white";
			      style = "filled";
			      fontname = "sans-serif";
			      fontsize = 10;
			    ];
			    "#/boundedcontexts/ordering/aggregates/order/valueobjects/money" [
			      label = <<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4"><TR><TD ALIGN="CENTER">«value object»<BR/><B>Money</B></TD></TR><TR><TD ALIGN="LEFT">amount: Decimal &lt;2dp&gt;</TD></TR></TABLE>>;
			      shape = "plain";
			      fillcolor = "white";
			      style = "filled";
			      fontname = "sans-serif";
			      fontsize = 10;
			    ];
			  }
			  "#/boundedcontexts/ordering/aggregates/order/entities/order" -> "#/boundedcontexts/ordering/aggregates/order/entities/line" [
			    arrowhead = "none";
			    arrowtail = "diamond";
			    style = "solid";
			    dir = "both";
			    label = "lines";
			    headlabel = "1..*";
			    labeldistance = 1.5;
			    fontsize = 10;
			    fontname = "sans-serif";
			  ];
			  "#/boundedcontexts/ordering/aggregates/order/entities/order" -> "#/boundedcontexts/ordering/aggregates/order/valueobjects/money" [
			    arrowhead = "vee";
			    arrowtail = "none";
			    style = "dashed";
			    label = "totals";
			    headlabel = "";
			    labeldistance = 1.5;
			    fontsize = 10;
			    fontname = "sans-serif";
			  ];
			}"
		`);
	});

	it("keeps punctuation-distinct canonical refs as distinct PlantUML aliases", () => {
		const map = new ODSRelationMap([]);
		for (const id of ["#/things/a-b", "#/things/a/b", "#/things/a~1b"]) {
			map.addNode({
				id,
				name: id,
				type: "entity",
				namespace,
				attributes: [],
			});
		}
		const aliases = [
			...relationMapToPlantUML(map).matchAll(/ as (ref_[0-9a-f]+) /g),
		].map((match) => match[1]);
		expect(new Set(aliases).size).toBe(3);
	});

	it("keeps distinct unpaired UTF-16 refs distinct in every output", async () => {
		const map = new ODSRelationMap([]);
		for (const id of ["#/things/\ud800", "#/things/\udc00"]) {
			map.addNode({
				id,
				name: "Malformed code unit",
				type: "entity",
				namespace,
				attributes: [],
			});
		}
		const drawn = relationMapToDigraph(map);
		const aliases = [
			...drawn.toPlantUML().matchAll(/ as (ref_[0-9a-f]+) /g),
		].map((match) => match[1]);
		expect(new Set(aliases).size).toBe(2);
		const dot = drawn.toDot();
		expect(dot.match(/__ods_utf16_[0-9a-f]+/g)).toHaveLength(2);
		expect((await drawn.toSVG()).match(/class="node"/g)).toHaveLength(2);
	});

	it("draws an identity as a dotted, stereotyped edge to the foreign root", () => {
		const map = buildMap();
		const order = map.nodes.get(
			"#/boundedcontexts/ordering/aggregates/order/entities/order",
		);
		const pet = map.addNode({
			id: "#/boundedcontexts/catalog/aggregates/pet/entities/pet",
			name: "Pet",
			type: "entity_root",
			namespace: [
				{ id: "ws", name: "Shop" },
				{ id: "#/boundedcontexts/catalog", name: "Catalog" },
				{ id: "#/boundedcontexts/catalog/aggregates/pet", name: "Pet" },
			],
			attributes: [],
		});
		if (!order) throw new Error("fixture missing the order node");
		map.addEdge({
			source: order,
			target: pet,
			label: "petId",
			relation: "identifies",
		});
		const drawn = relationMapToDigraph(map);
		expect(drawn.toDot()).toContain(
			'arrowhead = "vee";\n    arrowtail = "none";\n    style = "dashed";\n    label = "«identifies» petId"',
		);
		expect(drawn.toPlantUML()).toMatch(
			/ref_[0-9a-f]+ \.\.> ref_[0-9a-f]+ : «identifies» petId/,
		);
	});

	it("draws an identity of an external system as a box in the external stereotype", () => {
		const map = buildMap();
		const order = map.nodes.get(
			"#/boundedcontexts/ordering/aggregates/order/entities/order",
		);
		const scheme = map.addNode({
			id: "#/boundedcontexts/cardco",
			name: "CardCo",
			type: "external_context",
			namespace: [
				{ id: "ws", name: "Shop" },
				{ id: "#/boundedcontexts/cardco", name: "CardCo" },
			],
			attributes: [],
		});
		if (!order) throw new Error("fixture missing the order node");
		map.addEdge({
			source: order,
			target: scheme,
			label: "schemeRef",
			relation: "identifies",
		});
		const drawn = relationMapToDigraph(map);
		expect(drawn.toDot()).toContain("«external system»<BR/><B>CardCo</B>");
		expect(drawn.toDot()).toContain('label = "«identifies» schemeRef"');
	});

	it.each([
		["external_context", "external system"],
		["boundary_only_context", "boundary only"],
		["big_ball_of_mud_context", "big ball of mud"],
	] as const)("draws a %s box in the %s stereotype", (type, stereotype) => {
		const map = buildMap();
		map.addNode({
			id: "#/boundedcontexts/target",
			name: "Target",
			type,
			namespace: [
				{ id: "ws", name: "Shop" },
				{ id: "#/boundedcontexts/target", name: "Target" },
			],
			attributes: [],
		});
		const drawn = relationMapToDigraph(map);
		expect(drawn.toDot()).toContain(`«${stereotype}»<BR/><B>Target</B>`);
		expect(drawn.toPlantUML()).toContain(`<<${stereotype}>>`);
	});

	it("draws a borrowed value object in the lending context's package, in the borrowed stereotype", () => {
		const map = buildMap();
		const order = map.nodes.get(
			"#/boundedcontexts/ordering/aggregates/order/entities/order",
		);
		const kernelMoney = map.addNode({
			id: "#/boundedcontexts/shared_kernel/valueobjects/money",
			name: "Money",
			type: "foreign_valueobject",
			namespace: [
				{ id: "ws", name: "Shop" },
				{ id: "#/boundedcontexts/shared_kernel", name: "Shared Kernel" },
			],
			attributes: [{ name: "amountMinor", type: "int64", identity: false }],
		});
		if (!order) throw new Error("fixture missing the order node");
		map.addEdge({
			source: order,
			target: kernelMoney,
			label: "total",
			relation: "uses",
		});
		const drawn = relationMapToDigraph(map);
		// The stereotype is the foreign mark, and the cluster names the context
		// the value belongs to.
		expect(drawn.toDot()).toContain("«borrowed value object»<BR/><B>Money</B>");
		expect(drawn.toDot()).toContain('label = "Shared Kernel"');
		expect(drawn.toPlantUML()).toMatch(
			/class "Money" as ref_[0-9a-f]+ <<borrowed value object>>/,
		);
		expect(drawn.toPlantUML()).toContain('package "Shared Kernel" {');
	});

	it("draws a kind as a generalisation: a solid line with a hollow triangle at the parent", () => {
		const map = buildMap();
		const parent = map.nodes.get(
			"#/boundedcontexts/ordering/aggregates/order/entities/order",
		);
		const kind = map.addNode({
			id: "#/boundedcontexts/ordering/aggregates/order/entities/gift_order",
			name: "Gift Order",
			type: "entity",
			namespace,
			attributes: [],
		});
		if (!parent) throw new Error("fixture missing the order node");
		map.addEdge({
			source: kind,
			target: parent,
			label: "",
			relation: "specialises",
		});
		const drawn = relationMapToDigraph(map);
		// The triangle sits at the head, which is the parent: the line points
		// from the kind at what it is a kind of, and carries no label.
		expect(drawn.toDot()).toContain(
			'"#/boundedcontexts/ordering/aggregates/order/entities/gift_order" -> "#/boundedcontexts/ordering/aggregates/order/entities/order" [\n    arrowhead = "onormal";\n    arrowtail = "none";\n    style = "solid";\n    label = "";',
		);
		expect(drawn.toPlantUML()).toMatch(/ref_[0-9a-f]+ --\|> ref_[0-9a-f]+/);
	});

	it("marks an optional attribute with {opt} beside {id}", () => {
		const map = new ODSRelationMap([]);
		map.addNode({
			id: "#/boundedcontexts/ordering/aggregates/order/entities/order",
			name: "Order",
			type: "entity_root",
			namespace,
			attributes: [
				{ name: "id", type: "OrderId", identity: true },
				{ name: "note", type: "string", identity: false, optional: true },
			],
		});
		expect(relationMapToDigraph(map).toDot()).toContain("{id} id: OrderId");
		expect(relationMapToDigraph(map).toDot()).toContain("{opt} note: string");
		expect(relationMapToPlantUML(map)).toContain("{field} {id} id: OrderId");
		expect(relationMapToPlantUML(map)).toContain("{opt} note: string");
	});

	it("escapes HTML in attribute types", () => {
		expect(relationMapToDigraph(buildMap()).toDot()).toContain(
			"Decimal &lt;2dp&gt;",
		);
	});

	it("renders to SVG", async () => {
		const svg = await relationMapToDigraph(buildMap()).toSVG();
		expect(svg).toContain("«root entity»");
		expect(svg).toContain("{id} id: OrderId");
		expect(svg).toContain("1..*");
	});
});

describe("relationMapToPlantUML", () => {
	it("emits a class diagram with UML connectors", () => {
		const uml = relationMapToPlantUML(buildMap());
		expect(relationMapToDigraph(buildMap()).toPlantUML()).toBe(uml);
		expect(uml).toMatchInlineSnapshot(`
			"@startuml
			hide empty members
			skinparam classAttributeIconSize 0
			package "Sales / Orders / Ordering / Order" {
			  class "Order" as ref_0023002f0062006f0075006e0064006500640063006f006e00740065007800740073002f006f00720064006500720069006e0067002f0061006700670072006500670061007400650073002f006f0072006400650072002f0065006e007400690074006900650073002f006f0072006400650072 <<root entity>> {
			    {field} {id} id: OrderId
			    placedAt: Instant
			  }
			  class "Order Line" as ref_0023002f0062006f0075006e0064006500640063006f006e00740065007800740073002f006f00720064006500720069006e0067002f0061006700670072006500670061007400650073002f006f0072006400650072002f0065006e007400690074006900650073002f006c0069006e0065 <<entity>> {
			  }
			  class "Money" as ref_0023002f0062006f0075006e0064006500640063006f006e00740065007800740073002f006f00720064006500720069006e0067002f0061006700670072006500670061007400650073002f006f0072006400650072002f00760061006c00750065006f0062006a0065006300740073002f006d006f006e00650079 <<value object>> {
			    amount: Decimal <2dp>
			  }
			}
			ref_0023002f0062006f0075006e0064006500640063006f006e00740065007800740073002f006f00720064006500720069006e0067002f0061006700670072006500670061007400650073002f006f0072006400650072002f0065006e007400690074006900650073002f006f0072006400650072 *-- "1..*" ref_0023002f0062006f0075006e0064006500640063006f006e00740065007800740073002f006f00720064006500720069006e0067002f0061006700670072006500670061007400650073002f006f0072006400650072002f0065006e007400690074006900650073002f006c0069006e0065 : lines
			ref_0023002f0062006f0075006e0064006500640063006f006e00740065007800740073002f006f00720064006500720069006e0067002f0061006700670072006500670061007400650073002f006f0072006400650072002f0065006e007400690074006900650073002f006f0072006400650072 ..> ref_0023002f0062006f0075006e0064006500640063006f006e00740065007800740073002f006f00720064006500720069006e0067002f0061006700670072006500670061007400650073002f006f0072006400650072002f00760061006c00750065006f0062006a0065006300740073002f006d006f006e00650079 : totals
			@enduml"
		`);
	});
});
