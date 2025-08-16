import { ODSRelationMap } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { relationMapToDigraph } from "./relation-map";

describe("RelationMap", () => {
	it("should create a new RelationMap", () => {
		const map = new ODSRelationMap([]);
		const a1 = map.addNode({
			id: "a1",
			name: "A1",
			description: "A1 Description",
			type: "entity_root",
			namespace: [
				{
					id: "root",
					name: "Root",
				},
				{
					id: "sub",
					name: "Sub",
				},
			],
		});

		const a2 = map.addNode({
			id: "a2",
			name: "A2",
			description: "A2 Description",
			type: "entity",
			namespace: [
				{
					id: "root",
					name: "Root",
				},
				{
					id: "sub",
					name: "Sub",
				},
			],
		});

		map.addEdge({
			source: a1,
			target: a2,
			label: "A1 to A2",
			relation: "uses",
		});

		expect(relationMapToDigraph(map).toDot()).toMatchInlineSnapshot(`
			"digraph {
			  layout = "dot";
			  rankdir = "LR";
			  stylesheet = "data:text/css,.graph%20text%20%7B%0A%09font-family%3A%20sans-serif%3B%0A%09stroke%3A%20white%3B%0A%09paint-order%3A%20stroke%3B%0A%09stroke-width%3A%203%3B%0A%09stroke-linecap%3A%20square%3B%0A%7D%0A%0A.namespace%20polygon%20%7B%0A%09fill-opacity%3A%200.3%3B%0A%09stroke%3A%20none%3B%0A%7D%0A";
			  subgraph "root" {
			    cluster = true;
			    class = "namespace";
			    label = "Root";
			    style = "filled";
			    color = "lightgrey";
			    fontsize = 10;
			    fontname = "sans-serif";
			    subgraph "sub" {
			      cluster = true;
			      class = "namespace";
			      label = "Sub";
			      style = "filled";
			      color = "lightgrey";
			      fontsize = 10;
			      fontname = "sans-serif";
			      "a1" [
			        label = "A1";
			        shape = "box";
			        tooltip = "A1 Description";
			        fillcolor = "white";
			        style = "filled,solid";
			        fontname = "sans-serif";
			      ];
			      "a2" [
			        label = "A2";
			        shape = "box";
			        tooltip = "A2 Description";
			        fillcolor = "white";
			        style = "filled,dashed";
			        fontname = "sans-serif";
			      ];
			    }
			  }
			  "a1" -> "a2" [
			    fontsize = 10;
			    label = "A1 to A2";
			    labeldistance = 0;
			    arrowhead = "normal";
			    arrowtail = "none";
			    style = "dashed";
			  ];
			}"
		`);
	});
});
