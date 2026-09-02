<script lang="ts">
import {
	Background,
	Controls,
	type Edge,
	MiniMap,
	type Node,
	SvelteFlow,
} from "@xyflow/svelte";
import "@xyflow/svelte/dist/style.css";
import { fitClusters } from "../flow/cluster-fit";
import DiagramOptionsPanel from "../flow/DiagramOptionsPanel.svelte";
import { flowEdges, flowNodes, groupLabels } from "../flow/flow-nodes";
import type { Graph } from "../flow/graph";
import { diagramKind, sketchApplies } from "../flow/kind";
import LegendPanel from "../flow/LegendPanel.svelte";
import { layout } from "../flow/layout";
import { minimapNodeClass } from "../flow/minimap";
import { diagramOptions } from "../flow/options.svelte";
import { edgeTypes, nodeTypes } from "../flow/registry";
import SketchBackdrop from "../flow/SketchBackdrop.svelte";

/**
 * A pannable, zoomable version of a figure. Nodes are refs, so clicking one
 * navigates. The map's kind decides the style: only the context map takes
 * the sketch backdrop, and only there can a node be dragged out of its
 * cluster, the backdrop (or, in the cards style, the cluster boxes)
 * following it.
 */
let { graph, direction = "LR" }: { graph: Graph; direction?: "LR" | "TB" } =
	$props();
const positioned = $derived(layout(graph, direction));
const kind = $derived(diagramKind(graph));
const sketch = $derived(sketchApplies(kind, diagramOptions.style));
// Svelte Flow asks for raw state here; an effect rebuilds both arrays when the layout or options change.
let nodes = $state.raw<Node[]>([]);
let edges = $state.raw<Edge[]>([]);
const labels = $derived(groupLabels(positioned));
$effect(() => {
	nodes = flowNodes(positioned, {
		floating: diagramOptions.handles === "floating",
		sketch,
		free: kind === "context",
	});
	edges = flowEdges(positioned);
});
/** Free maps refit their cluster boxes round the nodes as one is dragged. */
const refit = () => {
	if (kind === "context") nodes = fitClusters(nodes);
};
</script>

<div class="interactive">
	<SvelteFlow bind:nodes bind:edges {nodeTypes} {edgeTypes} fitView fitViewOptions={{ padding: 0.25 }} minZoom={0.2} colorMode="system" nodesConnectable={false} elementsSelectable={false} onnodeclick={({ node }) => { location.hash = node.id; }} onnodedrag={refit} onnodedragstop={refit}>
		<Background />
		{#if sketch}<SketchBackdrop {nodes} groupLabels={labels} />{/if}
		<Controls showLock={false} />
		<MiniMap pannable zoomable width={120} height={80} nodeClass={minimapNodeClass} />
		<DiagramOptionsPanel {kind} />
		<LegendPanel {graph} {kind} />
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
