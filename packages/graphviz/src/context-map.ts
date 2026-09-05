import { Graphviz } from "@hpcc-js/wasm-graphviz";
import {
	type ContextRelationshipType,
	isDirectedRelationshipType,
	type ODSContextMap,
	type ODSContextMapEdge,
	type ODSContextMapNode,
} from "@open-domain-specification/core";
import {
	Digraph,
	Edge,
	type EdgeAttributesObject,
	Node,
	type NodeAttributesObject,
	Subgraph,
	toDot,
} from "ts-graphviz";
import { getDebug } from "./debug";
import {
	DOWNSTREAM_ROLE_LABELS,
	EXTERNAL_STEREOTYPE,
	IDENTITY_EDGE_LABEL,
	RELATIONSHIP_LABELS,
	UPSTREAM_ROLE_LABELS,
} from "./role-labels";

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

const debug = getDebug("context-map");

function namespaceId(node: ODSContextMapNode): string {
	return node.namespace.map((it) => it.id).join("__");
}

const SYMMETRIC_EDGE_COLORS: Partial<Record<ContextRelationshipType, string>> =
	{
		"shared-kernel": "brown",
		"separate-ways": "grey",
	};

/**
 * A big ball of mud is drawn as an irregular, muddy blob; a system the
 * enterprise does not own is a plain grey box under the «external system»
 * stereotype, so the wall between our model and somebody else's is the first
 * thing a reader sees.
 */
function nodeAttributes(node: ODSContextMapNode): NodeAttributesObject {
	const lines = [
		node.external && EXTERNAL_STEREOTYPE,
		node.name,
		node.bigBallOfMud && "(big ball of mud)",
		node.team && `[${node.team.name}]`,
	].filter(Boolean);
	return {
		label: lines.join("\n"),
		shape: node.bigBallOfMud ? "doubleoctagon" : node.external ? "box" : "egg",
		tooltip: node.description,
		width: 1.5,
		height: 1,
		fillcolor: node.bigBallOfMud
			? "#d7ccc8"
			: node.external
				? "#eceff1"
				: "white",
		style: node.bigBallOfMud ? "filled,dashed" : "filled,solid",
		fontname: "sans-serif",
	};
}

/**
 * Graphviz attributes that express one context-map edge. An edge implied by an
 * identity is drawn like any other implied one — dashed, no roles — under the
 * `«id»` stereotype, so the map says both that the dependency exists and what
 * put it there.
 */
function edgeAttributes(edge: ODSContextMapEdge): EdgeAttributesObject {
	const isDirected = isDirectedRelationshipType(edge.type);
	const byIdentity = edge.implied === "identity";
	const roles = (labels: Record<string, string>, values: string[]) =>
		values.map((it) => labels[it]).join("+");
	return {
		label: byIdentity ? IDENTITY_EDGE_LABEL : RELATIONSHIP_LABELS[edge.type],
		tooltip:
			edge.description ??
			(byIdentity
				? "implied by an identity attribute naming an entity of the other context"
				: edge.type),
		dir: isDirected ? "forward" : "none",
		style: edge.implied ? "dashed" : "solid",
		color: SYMMETRIC_EDGE_COLORS[edge.type] ?? "black",
		taillabel: isDirected
			? roles(UPSTREAM_ROLE_LABELS, edge.upstreamRoles)
			: "",
		headlabel: isDirected
			? roles(DOWNSTREAM_ROLE_LABELS, edge.downstreamRoles)
			: "",
		tailtooltip: edge.upstreamRoles.join(", "),
		headtooltip: edge.downstreamRoles.join(", "),
		fontsize: 10,
		labeldistance: 0,
		fontname: "sans-serif",
	};
}

export function contextMapToDigraph(contextMap: ODSContextMap): {
	toDot: () => string;
	toSVG: () => Promise<string>;
} {
	debug("Converting context map to digraph");
	const subgraphs: Record<string, Subgraph> = {};
	const nodes: Record<string, Node> = {};
	const edges: Record<string, Edge> = {};

	debug("Creating digraph");
	const g = new Digraph({
		layout: "dot",
		nodesep: 0.5,
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
		nodes[id] = nodes[id] || new Node(id, nodeAttributes(node));

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
			edges[id] || new Edge([sourceNode, targetNode], edgeAttributes(edge));
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
