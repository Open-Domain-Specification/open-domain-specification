import { Graphviz } from "@hpcc-js/wasm-graphviz";
import type {
	ConsumablePattern,
	ConsumptionPattern,
	ODSConsumableMap,
	ODSConsumptionMapNode,
} from "@open-domain-specification/core";
import { Digraph, Edge, Node, Subgraph, toDot } from "ts-graphviz";
import { getDebug } from "./debug";

const stylesheet = `\
.graph text {
	font-family: sans-serif;
	stroke: white;
	paint-order: stroke;
	stroke-width: 3;
	stroke-linecap: square;
}

.namespace polygon {
	fill-opacity: 0.2;
	stroke: none;
}
`;

const debug = getDebug("consumable-map");

function namespaceId(node: ODSConsumptionMapNode): string {
	return node.namespace.map((it) => it.id).join("__");
}

const CONUMPTION_PATTERN_LABELS: Record<ConsumptionPattern, string> = {
	conformist: "C",
	"customer-supplier": "C/s",
	partnership: "P",
	"anti-corruption-layer": "ACL",
	"separate-ways": "SW",
};

const CONSUMABLE_PATTERN_LABEL: Record<ConsumablePattern, string> = {
	"open-host-service": "OHS",
	"shared-kernel": "SK",
	"published-language": "PL",
	"customer-supplier": "c/S",
};

export function consumableMapToDigraph(contextMap: ODSConsumableMap): {
	toDot: () => string;
	toSVG: () => Promise<string>;
} {
	debug("Converting consumable map to digraph");
	const subgraphs: Record<string, Subgraph> = {};
	const nodes: Record<string, Node> = {};
	const edges: Record<string, Edge> = {};

	debug("Creating digraph");
	const g = new Digraph({
		layout: "dot",
		nodesep: 0.8,
		stylesheet: `data:text/css,${encodeURIComponent(stylesheet)}`,
	});

	debug("Creating subgraphs and nodes");
	for (const [id, node] of contextMap.nodes.entries()) {
		const nid = namespaceId(node);
		debug(`Processing node ${id} with namespace ID ${nid}`);

		debug(`Creating subgraph for namespace ${nid}`);
		const _subgraphs: Subgraph[] = [];

		for (const ns of node.namespace) {
			subgraphs[ns.id] =
				subgraphs[ns.id] ||
				new Subgraph(ns.id, {
					// @ts-expect-error
					cluster: true,
					class: "namespace",
					label: ns.name,
					style: "filled",
					color: "lightgrey",
					fontsize: 10,
					margin: "20,20",
					fontname: "sans-serif",
				});
			_subgraphs.push(subgraphs[ns.id]);

			debug(`Adding subgraph to parent subgraph or graph`);
			if (_subgraphs.length > 1) {
				_subgraphs[_subgraphs.length - 2].addSubgraph(subgraphs[ns.id]);
			} else {
				g.addSubgraph(subgraphs[ns.id]);
			}
		}

		debug(`Creating node ${id} in subgraph ${nid}`);
		nodes[id] =
			nodes[id] ||
			new Node(id, {
				label: node.name,
				shape: "egg",
				width: 1.5,
				height: 1,
				tooltip: node.description,
				fillcolor: "white",
				style: "filled,solid",
				fontname: "sans-serif",
			});

		debug(`Adding node ${id} to subgraph ${nid}`);
		_subgraphs[_subgraphs.length - 1].addNode(nodes[id]);
	}

	debug("Creating edges");
	for (const [id, edge] of contextMap.edges) {
		debug(`Processing edge ${id} from ${edge.source.id} to ${edge.target.id}`);
		const sourceNode = nodes[edge.source.id];
		const targetNode = nodes[edge.target.node.id];

		debug(`Source node: ${sourceNode.id}, Target node: ${targetNode.id}`);
		edges[id] =
			edges[id] ||
			new Edge([sourceNode, targetNode], {
				color: edge.targetPattern === "shared-kernel" ? "brown" : "black",
				taillabel: CONUMPTION_PATTERN_LABELS[edge.sourcePattern],
				headlabel: CONSUMABLE_PATTERN_LABEL[edge.targetPattern],
				tailtooltip: edge.sourcePattern,
				headtooltip: edge.targetPattern,
				fontsize: 10,
				labeldistance: 0,
				label: edge.target.name,
				fontname: "sans-serif",
			});
		debug(`Adding edge ${id} from ${sourceNode.id} to ${targetNode.id}`);
		g.addEdge(edges[id]);
	}

	debug(
		`Digraph creation complete Total nodes: ${Object.keys(nodes).length}, Total edges: ${Object.keys(edges).length}`,
	);

	return {
		toDot: () => {
			debug("Converting digraph to DOT format");
			return toDot(g);
		},
		toSVG: async () => {
			debug("Loading Graphviz");
			const graphviz = await Graphviz.load();
			return graphviz.dot(toDot(g));
		},
	};
}
