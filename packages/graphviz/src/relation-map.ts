import { Graphviz } from "@hpcc-js/wasm-graphviz";
import {
	type ODSRelationMap,
	type ODSRelationMapEdge,
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
import { STEREOTYPES } from "./role-labels";
import {
	escapeHtml,
	FONT,
	namespaceCluster,
	STYLESHEET_ATTRIBUTE,
} from "./theme";

const debug = getDebug("relation-map");

/** Every line the map can draw: the three relations, and the identity. */
type EdgeKind = ODSRelationMapEdge["relation"];

/**
 * UML arrow for each relation: `references` is a navigable association,
 * `includes` a composition with the diamond on the whole, `uses` a dependency.
 * An identity is a dependency too, and draws as one: dashed, with an
 * «identifies» stereotype that says which kind it is. The holder knows the
 * other entity's id and nothing else about it, which is exactly why this is
 * the one line allowed to leave a bounded context (decision 14). When that
 * entity is a child, the line lands on the child inside its aggregate's
 * cluster, where the root it is reached through is drawn beside it.
 */
const UML_ARROWS: Record<EdgeKind, EdgeAttributesObject> = {
	[RelationType.References]: {
		arrowhead: "vee",
		arrowtail: "none",
		style: "solid",
	},
	[RelationType.Includes]: {
		arrowhead: "none",
		arrowtail: "diamond",
		style: "solid",
		dir: "both",
	},
	[RelationType.Uses]: {
		arrowhead: "vee",
		arrowtail: "none",
		style: "dashed",
	},
	identifies: {
		arrowhead: "vee",
		arrowtail: "none",
		style: "dashed",
	},
};

/** PlantUML connector for each relation, mirroring {@link UML_ARROWS}. */
const PLANTUML_ARROWS: Record<EdgeKind, string> = {
	[RelationType.References]: "-->",
	[RelationType.Includes]: "*--",
	[RelationType.Uses]: "..>",
	identifies: "..>",
};

/** The identity edge says what it is, since its line alone cannot. */
const edgeLabel = (edge: ODSRelationMapEdge) =>
	edge.relation === "identifies" ? `«identifies» ${edge.label}` : edge.label;

/** The aggregate is the innermost namespace; the rest is its context path. */
function aggregateOf(node: ODSRelationMapNode) {
	return node.namespace[node.namespace.length - 1];
}

function clusterLabel(node: ODSRelationMapNode): string {
	const [, ...path] = node.namespace;
	return path.map((it) => it.name).join(" / ");
}

function attributeRow(attribute: ODSRelationMapNode["attributes"][number]) {
	const text = `${attribute.identity ? "{id} " : ""}${attribute.optional ? "{opt} " : ""}${attribute.name}: ${attribute.type}`;
	const title = attribute.description
		? ` TITLE="${escapeHtml(attribute.description)}"`
		: "";
	return `<TR><TD ALIGN="LEFT"${title}>${escapeHtml(text)}</TD></TR>`;
}

/** A UML class box: stereotype and name header, then an attribute compartment. */
function classLabel(node: ODSRelationMapNode): string {
	const header = `<TR><TD ALIGN="CENTER">«${STEREOTYPES[node.type]}»<BR/><B>${escapeHtml(node.name)}</B></TD></TR>`;
	const compartment = node.attributes.length
		? node.attributes.map(attributeRow).join("")
		: `<TR><TD ALIGN="LEFT"> </TD></TR>`;
	return `<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4">${header}${compartment}</TABLE>>`;
}

function edgeAttributes(edge: ODSRelationMapEdge): EdgeAttributesObject {
	return {
		...UML_ARROWS[edge.relation],
		label: edgeLabel(edge),
		headlabel: edge.cardinality ?? "",
		labeldistance: 1.5,
		fontsize: 10,
		fontname: FONT,
	};
}

function plantUmlAlias(node: ODSRelationMapNode): string {
	return node.id.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function plantUmlClass(node: ODSRelationMapNode): string {
	const body = node.attributes
		.map(
			(it) =>
				`    ${it.identity ? "{field} {id} " : ""}${it.optional ? "{opt} " : ""}${it.name}: ${it.type}`,
		)
		.join("\n");
	return `  class "${node.name}" as ${plantUmlAlias(node)} <<${STEREOTYPES[node.type]}>> {\n${body}${body ? "\n" : ""}  }`;
}

function plantUmlEdge(edge: ODSRelationMapEdge): string {
	const cardinality = edge.cardinality ? ` "${edge.cardinality}"` : "";
	const text = edgeLabel(edge);
	const label = text ? ` : ${text}` : "";
	return `${plantUmlAlias(edge.source)} ${PLANTUML_ARROWS[edge.relation]}${cardinality} ${plantUmlAlias(edge.target)}${label}`;
}

/** PlantUML class diagram source for the map, one package per aggregate. */
export function relationMapToPlantUML(relationMap: ODSRelationMap): string {
	const packages = new Map<string, { label: string; classes: string[] }>();
	for (const node of relationMap.nodes.values()) {
		const aggregate = aggregateOf(node);
		const group = packages.get(aggregate.id) ?? {
			label: clusterLabel(node),
			classes: [],
		};
		group.classes.push(plantUmlClass(node));
		packages.set(aggregate.id, group);
	}
	const lines = [
		"@startuml",
		"hide empty members",
		"skinparam classAttributeIconSize 0",
	];
	for (const group of packages.values()) {
		lines.push(`package "${group.label}" {`, ...group.classes, "}");
	}
	for (const edge of relationMap.edges.values()) lines.push(plantUmlEdge(edge));
	lines.push("@enduml");
	return lines.join("\n");
}

/** Draws the relation map as a UML class diagram, one cluster per aggregate. */
export function relationMapToDigraph(relationMap: ODSRelationMap): {
	toDot: () => string;
	toSVG: () => Promise<string>;
	toPlantUML: () => string;
} {
	debug("Converting relation map to class diagram");
	const clusters = new Map<string, Subgraph>();
	const nodes = new Map<string, Node>();

	const g = new Digraph({
		layout: "dot",
		rankdir: "LR",
		stylesheet: STYLESHEET_ATTRIBUTE,
	});

	for (const [id, node] of relationMap.nodes) {
		const aggregate = aggregateOf(node);
		let cluster = clusters.get(aggregate.id);
		if (!cluster) {
			cluster = new Subgraph(
				aggregate.id,
				namespaceCluster(clusterLabel(node)),
			);
			clusters.set(aggregate.id, cluster);
			g.addSubgraph(cluster);
		}

		debug(`Creating class ${id} in ${aggregate.id}`);
		const graphvizNode = new Node(id, {
			label: classLabel(node),
			shape: "plain",
			tooltip: node.description,
			fillcolor: "white",
			style: "filled",
			fontname: FONT,
			fontsize: 10,
		});
		nodes.set(id, graphvizNode);
		cluster.addNode(graphvizNode);
	}

	for (const [id, edge] of relationMap.edges) {
		const source = nodes.get(edge.source.id);
		const target = nodes.get(edge.target.id);
		if (!source || !target) continue;
		debug(`Adding edge ${id} from ${edge.source.id} to ${edge.target.id}`);
		g.addEdge(new Edge([source, target], edgeAttributes(edge)));
	}

	debug(
		`Class diagram complete: ${nodes.size} classes, ${relationMap.edges.size} relations`,
	);

	return {
		toDot: () => toDot(g),
		toSVG: async () => {
			const graphviz = await Graphviz.load();
			return graphviz.dot(toDot(g));
		},
		toPlantUML: () => relationMapToPlantUML(relationMap),
	};
}
