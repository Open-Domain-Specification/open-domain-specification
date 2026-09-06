import {
	type Disposition,
	dispositionOf,
} from "@open-domain-specification/core";
import { type Edge, MarkerType, type Node } from "@xyflow/svelte";
import { intentSummary } from "../evidence/labels";
import { DASHED_EDGE_CLASS } from "./edge-path";
import type { Positioned } from "./layout";

/**
 * What a context edge draws from beyond its geometry: the label at each end,
 * and — when the map knows the intent behind the edge — what the architecture
 * thinks of it, the line its badges disclose on hover, and what a click on one
 * of them should open.
 */
export type ContextEdgeData = {
	sourceLabel?: string;
	targetLabel?: string;
	/** Absent, or `by-design`, leaves every badge exactly as it was. */
	disposition?: Disposition;
	/** One-line hover text, appended to the role names on the end badges. */
	summary?: string;
	/** Given the badge's flow coordinates, so the card can be anchored to it. */
	onBadgeClick?: (at: { x: number; y: number }) => void;
	/**
	 * On a consumable edge, the consumer's own operations or policies behind the
	 * consumption; the edge shows them when the line is hovered.
	 */
	by?: string[];
};

/** What shapes the Svelte Flow nodes beyond the layout: the options and the map's freedoms. */
export type FlowNodeOptions = {
	/** Floating handles: the fixed handles hide and edges find their own ends. */
	floating: boolean;
	/** The sketch style: clusters hide behind the Voronoi backdrop. */
	sketch: boolean;
	/** Nodes may be dragged out of their cluster; the backdrop follows them. */
	free: boolean;
};

/** How many groups sit above a group; the shade lightens with it. */
export const depthOf = (positioned: Positioned, id: string | undefined) => {
	let d = 0;
	for (let p = id; p; p = positioned.groups?.find((g) => g.id === p)?.parent)
		d++;
	return d;
};

/** Label per group id, for the sketch backdrop's region and domain names. */
export const groupLabels = (positioned: Positioned) =>
	new Map((positioned.groups ?? []).map((g) => [g.id, g.label]));

/** A box's position relative to its parent group, as Svelte Flow wants for nested nodes. */
const relativeTo = (positioned: Positioned, id: string, parent?: string) => {
	// layout() places every node and group it was given, so the lookups cannot miss.
	const box = positioned.positions.get(id)!;
	const origin = parent ? positioned.positions.get(parent)! : { x: 0, y: 0 };
	return { x: box.x - origin.x, y: box.y - origin.y };
};

/**
 * The Svelte Flow nodes for a laid-out graph: the cluster regions first,
 * parents before children as Svelte Flow resolves `parentId` in array order,
 * then the nodes, each nested in its deepest group. A node keeps to its
 * parent's extent unless the map is `free`.
 */
export function flowNodes(
	positioned: Positioned,
	{ floating, sketch, free }: FlowNodeOptions,
): Node[] {
	const groups = positioned.groups ?? [];
	const clusters: Node[] = groups.map((g) => {
		const box = positioned.positions.get(g.id)!;
		return {
			id: g.id,
			type: "cluster",
			position: relativeTo(positioned, g.id, g.parent),
			parentId: g.parent,
			extent: g.parent ? "parent" : undefined,
			width: box.width,
			height: box.height,
			data: { label: g.label, depth: depthOf(positioned, g.id) - 1 },
			zIndex: -1,
			// The sketch backdrop draws the regions; the cluster stays for layout only.
			hidden: sketch,
			draggable: false,
			selectable: false,
			connectable: false,
		};
	});
	return [
		...clusters,
		...positioned.nodes.map((n) => ({
			id: n.id,
			type: n.type,
			position: relativeTo(positioned, n.id, n.groupId),
			parentId: n.groupId,
			extent: n.groupId && !free ? ("parent" as const) : undefined,
			data:
				n.type === "context" ? { ...n, floating, sketch } : { ...n, floating },
			draggable: true,
		})),
	];
}

/** Arrowhead size in stroke widths: the marker scales with the doubled edge stroke. */
const ARROW_SIZE = 9;

/**
 * The Svelte Flow edges for a graph. Every edge animates so the flow reads;
 * the stylesheet gives solid edges a long dash with a small gap, and an
 * implied one the `DASHED_EDGE_CLASS` class to shorten it, keyed to
 * keyframes sized for that shorter pattern so the animation still loops
 * without a jump. Directed edges get an arrowhead.
 */
export function flowEdges(positioned: Positioned): Edge[] {
	return positioned.edges.map((e) => ({
		id: e.id,
		type: e.type,
		source: e.source,
		target: e.target,
		sourceHandle: e.sourceHandle,
		targetHandle: e.targetHandle,
		label: e.label,
		animated: true,
		markerEnd: e.directed
			? {
					type: MarkerType.ArrowClosed,
					width: ARROW_SIZE,
					height: ARROW_SIZE,
					color: "var(--fg)",
				}
			: undefined,
		class: e.dashed ? DASHED_EDGE_CLASS : undefined,
		data: {
			sourceLabel: e.sourceLabel,
			targetLabel: e.targetLabel,
			by: e.by,
			...(e.intent && {
				disposition: dispositionOf(e.intent),
				summary: intentSummary(e.intent),
			}),
		} satisfies ContextEdgeData,
	}));
}
