<script lang="ts">
import {
	Background,
	Controls,
	type Edge,
	MarkerType,
	MiniMap,
	type Node,
	SvelteFlow,
} from "@xyflow/svelte";
import "@xyflow/svelte/dist/style.css";
import DiagramOptionsPanel from "../flow/DiagramOptionsPanel.svelte";
import type { Graph } from "../flow/graph";
import { layout } from "../flow/layout";
import { minimapNodeClass } from "../flow/minimap";
import { diagramOptions } from "../flow/options.svelte";
import { edgeTypes, nodeTypes } from "../flow/registry";
import SketchBackdrop from "../flow/SketchBackdrop.svelte";

/** A pannable, zoomable version of a figure. Nodes are refs, so clicking one navigates. */
let { graph, direction = "LR" }: { graph: Graph; direction?: "LR" | "TB" } =
	$props();
const positioned = $derived(layout(graph, direction));
/** How many groups sit above a group; the shade lightens with it. */
const depthOf = (id: string | undefined): number => {
	let d = 0;
	for (let p = id; p; p = positioned.groups?.find((g) => g.id === p)?.parent)
		d++;
	return d;
};
/** A box's position relative to its parent group, as Svelte Flow wants for nested nodes. */
const relativeTo = (id: string, parent?: string) => {
	// layout() places every node and group it was given, so the lookups cannot miss.
	const box = positioned.positions.get(id)!;
	const origin = parent ? positioned.positions.get(parent)! : { x: 0, y: 0 };
	return { x: box.x - origin.x, y: box.y - origin.y };
};
// Svelte Flow asks for raw state here; an effect rebuilds both arrays when the layout or options change.
let nodes = $state.raw<Node[]>([]);
let edges = $state.raw<Edge[]>([]);
const groups = $derived(positioned.groups ?? []);
const groupLabels = $derived(new Map(groups.map((g) => [g.id, g.label])));
$effect(() => {
	const floating = diagramOptions.handles === "floating";
	const sketch = diagramOptions.style === "sketch";
	// Groups first, parents before children, as Svelte Flow resolves parentId in array order.
	const clusters: Node[] = groups.map((g) => {
		const box = positioned.positions.get(g.id)!;
		return {
			id: g.id,
			type: "cluster",
			position: relativeTo(g.id, g.parent),
			parentId: g.parent,
			extent: g.parent ? "parent" : undefined,
			width: box.width,
			height: box.height,
			data: { label: g.label, depth: depthOf(g.id) - 1 },
			zIndex: -1,
			// The sketch backdrop draws the regions; the cluster stays for layout only.
			hidden: sketch,
			draggable: false,
			selectable: false,
			connectable: false,
		};
	});
	nodes = [
		...clusters,
		...positioned.nodes.map((n) => ({
			id: n.id,
			type: n.type,
			position: relativeTo(n.id, n.groupId),
			parentId: n.groupId,
			extent: n.groupId ? ("parent" as const) : undefined,
			data: { ...n, floating, sketch },
			draggable: true,
		})),
	];
	edges = positioned.edges.map((e) => ({
		id: e.id,
		type: e.type,
		source: e.source,
		target: e.target,
		sourceHandle: e.sourceHandle,
		targetHandle: e.targetHandle,
		label: e.label,
		animated: e.dashed,
		markerEnd: e.directed ? { type: MarkerType.ArrowClosed } : undefined,
		style: e.dashed ? "stroke-dasharray: 5 4" : undefined,
		data: { sourceLabel: e.sourceLabel, targetLabel: e.targetLabel },
	}));
});
</script>

<div class="interactive">
	<SvelteFlow bind:nodes bind:edges {nodeTypes} {edgeTypes} fitView minZoom={0.2} colorMode="system" onnodeclick={({ node }) => { location.hash = node.id; }}>
		<Background />
		{#if diagramOptions.style === "sketch"}<SketchBackdrop {nodes} {groupLabels} />{/if}
		<Controls showLock={false} />
		<MiniMap pannable zoomable width={120} height={80} nodeClass={minimapNodeClass} />
		<DiagramOptionsPanel />
	</SvelteFlow>
</div>

<style>
	.interactive { height: 60vh; min-height: 320px; }
	.interactive :global(.svelte-flow) { background: var(--bg); }
	.interactive :global(.svelte-flow__edge-text) { font-size: 11px; fill: var(--fg); }
	.interactive :global(.svelte-flow__minimap-node.minimap-cluster) {
		fill: transparent;
		stroke: var(--border);
	}
	.interactive :global(.svelte-flow__edge-textbg) { fill: var(--card); }
</style>
