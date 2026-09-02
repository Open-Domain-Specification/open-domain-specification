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
import type { Graph } from "../flow/graph";
import { layout } from "../flow/layout";
import OdsNode from "../flow/OdsNode.svelte";

/** A pannable, zoomable version of a figure. Nodes are refs, so clicking one navigates. */
let { graph, direction = "LR" }: { graph: Graph; direction?: "LR" | "TB" } =
	$props();
const nodeTypes = { ods: OdsNode };
const positioned = $derived(layout(graph, direction));
let nodes = $derived.by<Node[]>(() =>
	positioned.nodes.map((n) => ({
		id: n.id,
		type: "ods",
		// layout() places every node it was given, so the lookup cannot miss.
		position: positioned.positions.get(n.id)!,
		data: n,
		draggable: true,
	})),
);
let edges = $derived.by<Edge[]>(() =>
	positioned.edges.map((e) => ({
		id: e.id,
		source: e.source,
		target: e.target,
		label: e.label,
		animated: e.dashed,
		markerEnd: e.directed ? { type: MarkerType.ArrowClosed } : undefined,
		style: e.dashed ? "stroke-dasharray: 5 4" : undefined,
		data: { sourceLabel: e.sourceLabel, targetLabel: e.targetLabel },
	})),
);
</script>

<div class="interactive">
	<SvelteFlow bind:nodes bind:edges {nodeTypes} fitView minZoom={0.2} colorMode="system" onnodeclick={({ node }) => { location.hash = node.id; }}>
		<Background />
		<Controls showLock={false} />
		<MiniMap pannable zoomable />
	</SvelteFlow>
</div>

<style>
	.interactive { height: 60vh; min-height: 320px; }
	.interactive :global(.svelte-flow) { background: var(--bg); }
	.interactive :global(.svelte-flow__edge-text) { font-size: 11px; fill: var(--fg); }
	.interactive :global(.svelte-flow__edge-textbg) { fill: var(--card); }
</style>
