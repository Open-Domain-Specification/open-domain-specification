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
		expect(drawn.toPlantUML()).toContain(
			"boundedcontexts_ordering_aggregates_order_entities_order ..> boundedcontexts_catalog_aggregates_pet_entities_pet : «identifies» petId",
		);
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
			  class "Order" as boundedcontexts_ordering_aggregates_order_entities_order <<root entity>> {
			    {field} {id} id: OrderId
			    placedAt: Instant
			  }
			  class "Order Line" as boundedcontexts_ordering_aggregates_order_entities_line <<entity>> {
			  }
			  class "Money" as boundedcontexts_ordering_aggregates_order_valueobjects_money <<value object>> {
			    amount: Decimal <2dp>
			  }
			}
			boundedcontexts_ordering_aggregates_order_entities_order *-- "1..*" boundedcontexts_ordering_aggregates_order_entities_line : lines
			boundedcontexts_ordering_aggregates_order_entities_order ..> boundedcontexts_ordering_aggregates_order_valueobjects_money : totals
			@enduml"
		`);
	});
});
