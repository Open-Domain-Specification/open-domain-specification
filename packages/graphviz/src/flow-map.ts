import { Graphviz } from "@hpcc-js/wasm-graphviz";
import type {
	ODSFlowMap,
	ODSFlowMapNode,
} from "@open-domain-specification/core";
import {
	Digraph,
	Edge,
	type EdgeAttributesObject,
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
	// A process is a note that outlives one reaction, so it is drawn as the
	// folder that keeps several of them: same family as the policy, plainly
	// not the same thing (decision 23).
	process: { shape: "folder", fillcolor: "#d1c4e9" },
};

/** A step in the chain is a plain arrow; what ends a process is not a step. */
const ENDS_EDGE: EdgeAttributesObject = { style: "dashed", label: "ends" };

/** Whether a node stands for a reaction rather than a consumable. */
const isReaction = (node: ODSFlowMapNode) =>
	node.type === "policy" || node.type === "process";

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
			label: isReaction(node) ? node.name : `${node.name}\n(${owner})`,
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
		if (source && target)
			g.addEdge(
				new Edge(
					[source, target],
					edge.kind === "ends"
						? { ...ENDS_EDGE, fontname: "sans-serif", fontsize: 10 }
						: {},
				),
			);
	}

	return {
		toDot: () => toDot(g),
		toSVG: async () => {
			const graphviz = await Graphviz.load();
			return graphviz.dot(toDot(g));
		},
	};
}
