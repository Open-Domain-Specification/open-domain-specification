import { Graphviz } from "@hpcc-js/wasm-graphviz";
import {
	type ODSRelationMap,
	type ODSRelationMapNode,
	RelationType,
} from "@open-domain-specification/core";
import {
	Digraph,
	Edge,
	type EdgeAttributesObject,
	Node,
	Subgraph,
	toDot,
} from "ts-graphviz";
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
	fill-opacity: 0.3;
	stroke: none;
}
`;

const RelationArrowProps: Record<RelationType, EdgeAttributesObject> = {
	[RelationType.References]: {
		label: "«references»",
		labeldistance: 0,
		arrowhead: "vee",
		arrowtail: "none",
		style: "dashed",
	},
	[RelationType.Includes]: {
		label: "«includes»",
		labeldistance: 0,
		arrowhead: "none",
		arrowtail: "diamond",
		style: "solid",
		dir: "both",
	},
	[RelationType.Uses]: {
		label: "«uses»",
		labeldistance: 0,
		arrowhead: "normal",
		arrowtail: "none",
		style: "dashed",
	},
};

const debug = getDebug("relation-map");

function namespaceId(node: ODSRelationMapNode): string {
	return node.namespace.map((it) => it.id).join("__");
}

export function relationMapToDigraph(contextMap: ODSRelationMap): {
	toDot: () => string;
	toSVG: () => Promise<string>;
} {
	debug("Converting relation map to digraph");
	const subgraphs: Record<string, Subgraph> = {};
	const nodes: Record<string, Node> = {};
	const edges: Record<string, Edge> = {};

	debug("Creating digraph");
	const g = new Digraph({
		layout: "dot",
		rankdir: "LR",
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
				shape:
					node.type === "entity_root"
						? "box"
						: node.type === "entity"
							? "box"
							: "ellipse",
				tooltip: node.description,
				fillcolor: "white",
				style: node.type === "entity_root" ? "filled,solid" : "filled,dashed",
				fontname: "sans-serif",
			});

		debug(`Adding node ${id} to subgraph ${nid}`);
		_subgraphs[_subgraphs.length - 1].addNode(nodes[id]);
	}

	debug("Creating edges");
	for (const [id, edge] of contextMap.edges) {
		debug(`Processing edge ${id} from ${edge.source.id} to ${edge.target.id}`);
		const sourceNode = nodes[edge.source.id];
		const targetNode = nodes[edge.target.id];

		debug(`Source node: ${sourceNode.id}, Target node: ${targetNode.id}`);
		edges[id] =
			edges[id] ||
			new Edge([sourceNode, targetNode], {
				fontsize: 10,
				...RelationArrowProps[edge.relation],
				label: edge.label,
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
