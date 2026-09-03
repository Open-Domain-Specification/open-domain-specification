import { Graphviz } from "@hpcc-js/wasm-graphviz";
import type {
	ODSFlowMap,
	ODSFlowMapNode,
} from "@open-domain-specification/core";
import {
	Digraph,
	Edge,
	Node,
	type NodeAttributesObject,
	toDot,
} from "ts-graphviz";
import { getDebug } from "./debug";

const debug = getDebug("flow-map");

const NODE_STYLES: Record<ODSFlowMapNode["type"], NodeAttributesObject> = {
	event: { shape: "ellipse", fillcolor: "#ffe0b2" },
	command: { shape: "box", fillcolor: "#bbdefb" },
	policy: { shape: "note", fillcolor: "#e1bee7" },
};

/** Draws the event → policy → command → event flow left to right. */
export function flowMapToDigraph(flowMap: ODSFlowMap): {
	toDot: () => string;
	toSVG: () => Promise<string>;
} {
	debug("Converting flow map to digraph");
	const g = new Digraph({ layout: "dot", rankdir: "LR", nodesep: 0.4 });
	const nodes = new Map<string, Node>();

	for (const [id, node] of flowMap.nodes) {
		const owner = node.namespace[node.namespace.length - 1]?.name ?? "";
		const graphvizNode = new Node(id, {
			...NODE_STYLES[node.type],
			label: node.type === "policy" ? node.name : `${node.name}\n(${owner})`,
			tooltip: node.description,
			style: "filled",
			fontname: "sans-serif",
			fontsize: 10,
		});
		nodes.set(id, graphvizNode);
		g.addNode(graphvizNode);
	}

	for (const edge of flowMap.edges.values()) {
		const source = nodes.get(edge.source.id);
		const target = nodes.get(edge.target.id);
		if (source && target) g.addEdge(new Edge([source, target]));
	}

	return {
		toDot: () => toDot(g),
		toSVG: async () => {
			const graphviz = await Graphviz.load();
			return graphviz.dot(toDot(g));
		},
	};
}
