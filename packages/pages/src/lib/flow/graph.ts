import type {
	ODSConsumableMap,
	ODSContextMap,
	ODSRelationMap,
} from "@open-domain-specification/core";
import { ICONS } from "../icons";

/**
 * A host-neutral graph the interactive diagram draws. Each core map converts
 * to it, so one Svelte Flow organism serves every figure. Node ids are refs,
 * so clicking a node navigates.
 */
export type GraphNode = {
	id: string;
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

const groupOf = (ns: { name: string }[]) =>
	ns
		.slice(1)
		.map((n) => n.name)
		.join(" / ") || undefined;

const SYMMETRIC = new Set(["partnership", "shared-kernel", "separate-ways"]);

/** Relationship types with no upstream or downstream side. */
export const isSymmetricRelationship = (type: string) => SYMMETRIC.has(type);

export function contextGraph(map: ODSContextMap): Graph {
	return {
		nodes: [...map.nodes.values()].map((n) => ({
			id: n.id,
			label: n.name,
			icon: ICONS.boundedcontext,
			group: groupOf(n.namespace),
			chips: [
				...(n.team ? [n.team.name] : []),
				...(n.bigBallOfMud ? ["big ball of mud"] : []),
			],
			tone: n.bigBallOfMud ? "warn" : "",
		})),
		edges: [...map.edges.entries()].map(([id, e]) => ({
			id,
			source: e.source.id,
			target: e.target.id,
			label: e.type,
			dashed: e.implied,
			directed: !isSymmetricRelationship(e.type),
			sourceLabel: e.upstreamRoles.join(", ") || undefined,
			targetLabel: e.downstreamRoles.join(", ") || undefined,
		})),
	};
}

export function consumableGraph(map: ODSConsumableMap): Graph {
	return {
		nodes: [...map.nodes.values()].map((n) => ({
			id: n.id,
			label: n.name,
			icon: n.type === "service" ? ICONS.service : ICONS.aggregate,
			group: groupOf(n.namespace),
		})),
		edges: [...map.edges.entries()].map(([id, e]) => ({
			id,
			source: e.source.id,
			target: e.target.node.id,
			label: e.target.name,
			directed: true,
			sourceLabel: e.sourcePattern,
			targetLabel: e.targetPattern,
		})),
	};
}

export function relationGraph(map: ODSRelationMap): Graph {
	return {
		nodes: [...map.nodes.values()].map((n) => ({
			id: n.id,
			label: n.name,
			icon: n.type === "valueobject" ? ICONS.valueobject : ICONS.entity,
			group: groupOf(n.namespace),
			chips:
				n.type === "entity_root"
					? ["root"]
					: n.type === "valueobject"
						? ["value object"]
						: [],
			attributes: n.attributes.map((a) => ({
				name: a.name,
				type: a.type,
				identity: a.identity,
			})),
			tone:
				n.type === "entity_root"
					? "core"
					: n.type === "valueobject"
						? "muted"
						: "",
		})),
		edges: [...map.edges.entries()].map(([id, e]) => ({
			id,
			source: e.source.id,
			target: e.target.id,
			label: e.label,
			directed: true,
			dashed: e.relation === "references",
			targetLabel: e.cardinality,
		})),
	};
}
