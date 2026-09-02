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
import FloatingEdge from "../flow/FloatingEdge.svelte";
import type { Graph } from "../flow/graph";
import { layout } from "../flow/layout";
import OdsNode from "../flow/OdsNode.svelte";
import { diagramOptions } from "../flow/options.svelte";

/** A pannable, zoomable version of a figure. Nodes are refs, so clicking one navigates. */
let { graph, direction = "LR" }: { graph: Graph; direction?: "LR" | "TB" } =
	$props();
const nodeTypes = { ods: OdsNode };
const edgeTypes = { floating: FloatingEdge };
/** Built-in edge types draw between the fixed handles; "default" is Svelte Flow's bezier. */
const BUILT_IN = {
	bezier: "default",
	straight: "straight",
	step: "step",
	smoothstep: "smoothstep",
} as const;
const edgeType = $derived(
	diagramOptions.handles === "floating"
		? "floating"
		: BUILT_IN[diagramOptions.edges],
);
const positioned = $derived(layout(graph, direction));
// Svelte Flow asks for raw state here; an effect rebuilds both arrays when the layout or options change.
let nodes = $state.raw<Node[]>([]);
let edges = $state.raw<Edge[]>([]);
$effect(() => {
	const floating = diagramOptions.handles === "floating";
	const type = edgeType;
	nodes = positioned.nodes.map((n) => ({
		id: n.id,
		type: "ods",
		// layout() places every node it was given, so the lookup cannot miss.
		position: positioned.positions.get(n.id)!,
		data: { ...n, floating },
		draggable: true,
	}));
	edges = positioned.edges.map((e) => ({
		id: e.id,
		type,
		source: e.source,
		target: e.target,
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
		<Controls showLock={false} />
		<MiniMap pannable zoomable />
		<DiagramOptionsPanel />
	</SvelteFlow>
</div>

<style>
	.interactive { height: 60vh; min-height: 320px; }
	.interactive :global(.svelte-flow) { background: var(--bg); }
	.interactive :global(.svelte-flow__edge-text) { font-size: 11px; fill: var(--fg); }
	.interactive :global(.svelte-flow__edge-textbg) { fill: var(--card); }
</style>
