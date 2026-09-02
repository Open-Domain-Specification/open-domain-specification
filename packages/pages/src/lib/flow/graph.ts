/**
 * A host-neutral graph the interactive diagram draws. Each core map converts
 * to it, so one Svelte Flow organism serves every figure. Node ids are refs,
 * so clicking a node navigates.
 */
export type GraphNode = {
	id: string;
	/** Component to draw with, from the registry; defaults to the generic card node. */
	type?: string;
	label: string;
	icon: string;
	/** Cluster path shown as a subtitle, e.g. "Petstore Commerce / Sales". */
	group?: string;
	chips?: string[];
	/** Attribute compartment for class-diagram nodes. */
	attributes?: { name: string; type: string; identity: boolean }[];
	tone?: "" | "core" | "warn" | "muted";
};

export type GraphEdge = {
	id: string;
	/** Component to draw with, from the registry; defaults to the option-driven edge. */
	type?: string;
	source: string;
	target: string;
	label?: string;
	dashed?: boolean;
	/** Arrow head at the target; symmetric relationships have none. */
	directed?: boolean;
	/** Text at each end, e.g. roles or cardinality. */
	sourceLabel?: string;
	targetLabel?: string;
};

export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };

/** Cluster path below the workspace as a subtitle, e.g. "Petstore Commerce / Sales". */
export const groupOf = (ns: { name: string }[]) =>
	ns
		.slice(1)
		.map((n) => n.name)
		.join(" / ") || undefined;

const SYMMETRIC = new Set(["partnership", "shared-kernel", "separate-ways"]);

/** Relationship types with no upstream or downstream side. */
export const isSymmetricRelationship = (type: string) => SYMMETRIC.has(type);

export { consumableGraph } from "./consumable-graph";
export { contextGraph } from "./context-graph";
export { relationGraph } from "./relation-graph";
