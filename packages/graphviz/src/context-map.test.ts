import { ODSContextMap } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { contextMapToDigraph } from "./context-map";

describe("ContextMap", () => {
	it("should create a new ContextMap", () => {
		const odsContextMap = new ODSContextMap([]);
		const a1 = odsContextMap.addNode({
			id: "a1",
			name: "A1",
			description: "A1 Description",
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

		const a2 = odsContextMap.addNode({
			id: "a2",
			name: "A2",
			description: "A2 Description",
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

		odsContextMap.addEdge({
			source: a1,
			target: a2,
			sourcePattern: "conformist",
			targetPattern: "open-host-service",
		});

		expect(contextMapToDigraph(odsContextMap).toDot()).toMatchInlineSnapshot(`
			"digraph {
			  layout = "dot";
			  nodesep = 0.5;
			  stylesheet = "data:text/css,.graph%20text%20%7B%0A%09font-family%3A%20sans-serif%3B%0A%09stroke%3A%20white%3B%0A%09paint-order%3A%20stroke%3B%0A%09stroke-width%3A%203%3B%0A%09stroke-linecap%3A%20square%3B%0A%7D%0A%0A.namespace%20polygon%20%7B%0A%09fill-opacity%3A%200.2%3B%0A%09stroke%3A%20none%3B%0A%7D%0A";
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
			        shape = "egg";
			        tooltip = "A1 Description";
			        width = 1.5;
			        height = 1;
			        fixedsize = "shape";
			        fillcolor = "white";
			        style = "filled,solid";
			        fontname = "sans-serif";
			      ];
			      "a2" [
			        label = "A2";
			        shape = "egg";
			        tooltip = "A2 Description";
			        width = 1.5;
			        height = 1;
			        fixedsize = "shape";
			        fillcolor = "white";
			        style = "filled,solid";
			        fontname = "sans-serif";
			      ];
			    }
			  }
			  "a2" -> "a1" [
			    color = "black";
			    taillabel = "C";
			    headlabel = "OHS";
			    tailtooltip = "conformist";
			    headtooltip = "open-host-service";
			    fontsize = 10;
			    labeldistance = 0;
			    label = "";
			    fontname = "sans-serif";
			  ];
			}"
		`);
	});
});
