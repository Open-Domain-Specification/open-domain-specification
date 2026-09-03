import type { ContextRelationship } from "@open-domain-specification/core";

/**
 * A host-neutral graph the interactive diagram draws. Each core map converts
 * to it, so one Svelte Flow organism serves every figure. Node ids are refs,
 * so clicking a node navigates.
 */
export type GraphNode = {
	id: string;
	/** Component to draw with, from the registry. */
	type: string;
	label: string;
	icon: string;
	/** Cluster path shown as a subtitle, e.g. "Petstore Commerce / Sales". */
	groupPath?: string;
	/** The deepest cluster the node sits in, from {@link Graph.groups}. */
	groupId?: string;
	chips?: string[];
	/** Attribute compartment for class-diagram nodes. */
	attributes?: { name: string; type: string; identity: boolean }[];
	tone?: "" | "core" | "warn" | "muted";
};

export type GraphEdge = {
	id: string;
	/** Component to draw with, from the registry. */
	type: string;
	source: string;
	target: string;
	label?: string;
	dashed?: boolean;
	/** Arrow head at the target; symmetric relationships have none. */
	directed?: boolean;
	/** Text at each end, e.g. roles or cardinality. */
	sourceLabel?: string;
	targetLabel?: string;
	/** Handle ids at each end, when a node offers more than one. */
	sourceHandle?: string;
	targetHandle?: string;
	/**
	 * The strategic intent this edge stands for, when the map knows it. It is
	 * what the badges mark with their disposition and what the disclosure card
	 * opens; an edge without one draws exactly as it always has.
	 */
	intent?: ContextRelationship;
};

/** A shaded region grouping nodes, nested through `parent`, as a Graphviz cluster. */
export type GraphGroup = { id: string; label: string; parent?: string };

export type Graph = {
	nodes: GraphNode[];
	edges: GraphEdge[];
	/** Clusters, parents listed before their children. */
	groups?: GraphGroup[];
};

/** The group id for a namespace entry; prefixed so it never collides with a node ref. */
export const groupIdOf = (ns: { id: string }) => `cluster:${ns.id}`;

/**
 * Nested groups from every node's namespace path, one per entry, each parented
 * to the entry before it, in the same order as the Graphviz images draw their
 * clusters. Parents come before children so the diagram can add them in order.
 */
export function namespaceGroups(
	nodes: { namespace: { id: string; name: string }[] }[],
): GraphGroup[] {
	const groups = new Map<string, GraphGroup>();
	for (const { namespace } of nodes) {
		namespace.forEach((ns, i) => {
			const id = groupIdOf(ns);
			if (!groups.has(id))
				groups.set(id, {
					id,
					label: ns.name,
					parent: i > 0 ? groupIdOf(namespace[i - 1]) : undefined,
				});
		});
	}
	return [...groups.values()].sort(
		(a, b) => depth(groups, a) - depth(groups, b),
	);
}

function depth(groups: Map<string, GraphGroup>, g: GraphGroup): number {
	let d = 0;
	for (let p = g.parent; p; p = groups.get(p)?.parent) d++;
	return d;
}

/** The deepest namespace entry's group id, or none for an empty namespace. */
export const deepestGroup = (ns: { id: string }[]) =>
	ns.length ? groupIdOf(ns[ns.length - 1]) : undefined;

/** Cluster path below the workspace as a subtitle, e.g. "Petstore Commerce / Sales". */
export const groupPathOf = (ns: { name: string }[]) =>
	ns
		.slice(1)
		.map((n) => n.name)
		.join(" / ") || undefined;

export { isSymmetricRelationship } from "@open-domain-specification/core";
export { consumableGraph } from "./consumable-graph";
export { contextGraph } from "./context-graph";
export { relationGraph } from "./relation-graph";
