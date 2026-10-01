import {
	ODSConsumableMap,
	ODSContextMap,
	ODSFlowMap,
	ODSRelationMap,
	ReactionChain,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { consumableMapToDigraph } from "./consumable-map";
import { contextMapToDigraph } from "./context-map";
import { flowMapToDigraph } from "./flow-map";
import { graphIdentifier } from "./identifier";
import { relationMapToDigraph } from "./relation-map";

const IDS = [
	"#/things/a\nb",
	"#/things/a\\nb",
	"#/things/a\0b",
	"#/things/a\\0b",
	"#/things/\ud800",
	"#/things/\udc00",
	"#/things/�",
	"__ods_utf16_d800",
];
const namespace = [{ id: "scope", name: "Scope" }];

const expectDistinctGraph = async (drawn: {
	toDot: () => string;
	toSVG: () => Promise<string>;
}) => {
	const dot = drawn.toDot();
	for (const id of IDS) expect(dot).toContain(`"${graphIdentifier(id)}" [`);
	expect(dot).toContain(
		`"${graphIdentifier(IDS[0])}" -> "${graphIdentifier(IDS[1])}"`,
	);
	const svg = await drawn.toSVG();
	expect(svg.match(/class="node"/g)).toHaveLength(IDS.length);
	expect(svg.match(/class="edge"/g)).toHaveLength(1);
};

describe("DOT identifier boundaries", () => {
	it("keeps every context-map node identity and edge distinct", async () => {
		const map = new ODSContextMap([], [], []);
		const nodes = IDS.map((id, index) =>
			map.addNode({ id, name: `Node ${index}`, description: "", namespace }),
		);
		map.addEdge({
			source: nodes[0],
			target: nodes[1],
			type: "customer-supplier",
			upstreamRoles: [],
			downstreamRoles: [],
			implied: false,
		});
		await expectDistinctGraph(contextMapToDigraph(map));
	});

	it("keeps every consumable-map node identity and edge distinct", async () => {
		const map = new ODSConsumableMap([]);
		const nodes = IDS.map((id, index) =>
			map.addNode({
				id,
				name: `Node ${index}`,
				description: "",
				type: "service",
				namespace,
			}),
		);
		const target = map.addNodeSlot({
			id: "target-slot",
			name: "Target",
			type: "operation",
			node: nodes[1],
		});
		map.addEdge({ source: nodes[0], target, by: [] });
		await expectDistinctGraph(consumableMapToDigraph(map));
	});

	it("keeps every flow-map node identity and edge distinct", async () => {
		const map = new ODSFlowMap(new ReactionChain([]));
		const nodes = IDS.map((id, index) =>
			map.addNode({ id, name: `Node ${index}`, type: "command", namespace }),
		);
		map.addEdge({ source: nodes[0], target: nodes[1] });
		await expectDistinctGraph(flowMapToDigraph(map));
	});

	it("keeps every relation-map node identity and edge distinct", async () => {
		const map = new ODSRelationMap([]);
		const nodes = IDS.map((id, index) =>
			map.addNode({
				id,
				name: `Node ${index}`,
				type: "entity",
				namespace,
				attributes: [],
			}),
		);
		map.addEdge({
			source: nodes[0],
			target: nodes[1],
			relation: "uses",
			label: "control twin",
		});
		await expectDistinctGraph(relationMapToDigraph(map));
	});
});
