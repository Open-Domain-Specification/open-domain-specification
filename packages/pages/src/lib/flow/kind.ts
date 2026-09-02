import type { Graph } from "./graph";

/**
 * Which map a graph draws, from its node types: the DDD context map, the
 * consumable map (a UML component diagram) or the relation map (a UML class
 * diagram). Only the context map has the sketch style; the other two are
 * always drawn in their UML form.
 */
export type DiagramKind = "context" | "consumable" | "relation";

const KINDS: DiagramKind[] = ["context", "consumable", "relation"];

/** The kind of the graph's first node; an empty or unknown graph counts as a context map. */
export function diagramKind(graph: Pick<Graph, "nodes">): DiagramKind {
	const type = graph.nodes[0]?.type as DiagramKind | undefined;
	return type && KINDS.includes(type) ? type : "context";
}

/** Whether the sketch style applies: only the context map has one. */
export const sketchApplies = (kind: DiagramKind, style: string) =>
	kind === "context" && style === "sketch";
