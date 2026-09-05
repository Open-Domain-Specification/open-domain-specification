<script lang="ts">
	/**
	 * The zoom floor bounds how far the panel-aware fit can pull a wide map in.
	 * At 0.2 NorthBank's fifteen contexts no longer fit beside the legend in a
	 * narrow webview and a node slid under the options panel; 0.1 leaves the fit
	 * room on every shipped model, and fullscreen and zoom are there for reading.
	 */
	const MIN_ZOOM = 0.1;
import {
	Background,
	Controls,
	type Edge,
	MiniMap,
	type Node,
	SvelteFlow,
} from "@xyflow/svelte";
import "@xyflow/svelte/dist/style.css";
import { onDestroy } from "svelte";
import { fitClusters } from "../flow/cluster-fit";
import DiagramOptionsPanel from "../flow/DiagramOptionsPanel.svelte";
import { createDisclosure, withDisclosure } from "../flow/disclosure.svelte";
import { flowEdges, flowNodes, groupLabels } from "../flow/flow-nodes";
import { createFullscreen } from "../flow/fullscreen.svelte";
import type { Graph } from "../flow/graph";
import { diagramKind, sketchApplies } from "../flow/kind";
import LegendPanel from "../flow/LegendPanel.svelte";
import { layout } from "../flow/layout";
import { minimapNodeClass } from "../flow/minimap";
import { diagramOptions } from "../flow/options.svelte";
import PanelFit from "../flow/PanelFit.svelte";
import { edgeTypes, nodeTypes } from "../flow/registry";
import SketchBackdrop from "../flow/SketchBackdrop.svelte";
import { hostColorMode } from "../flow/theme.svelte";
import DisclosureCard from "./DisclosureCard.svelte";

/**
 * A pannable, zoomable version of a figure. Nodes are refs, so clicking one
 * navigates. The figure can be blown up to a full-viewport overlay, which is
 * how a large map is explored from a cramped editor split.
 * The map's kind decides the style: only the context map takes
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
const disclosure = createDisclosure();
$effect(() => {
	nodes = flowNodes(positioned, {
		floating: diagramOptions.handlesFor(kind) === "floating",
		sketch,
		free: kind === "context",
	});
	// The intent rides on the graph edge; only the click needs this component,
	// which is the one place that can hold the open card.
	edges = withDisclosure(flowEdges(positioned), positioned, disclosure);
});
const fullscreen = createFullscreen();
/** Measured by the panel-aware fit, so it needs the box the panels float over. */
let container = $state<HTMLElement>();
onDestroy(fullscreen.stop);
onDestroy(disclosure.stop);
/** Free maps refit their cluster boxes round the nodes as one is dragged. */
const refit = () => {
	if (kind === "context") nodes = fitClusters(nodes);
};
</script>

<div class="interactive" class:fullscreen={fullscreen.active} bind:this={container}>
	<SvelteFlow bind:nodes bind:edges {nodeTypes} {edgeTypes} fitView fitViewOptions={{ padding: 0.25 }} minZoom={MIN_ZOOM} colorMode={hostColorMode.value} nodesConnectable={false} elementsSelectable={false} onnodeclick={({ node }) => { if (node.id.startsWith("#")) { fullscreen.exit(); location.hash = node.id; } }} onnodedrag={refit} onnodedragstop={refit}>
		<Background />
		{#if sketch}<SketchBackdrop {nodes} groupLabels={labels} />{/if}
		<Controls showLock={false} />
		<MiniMap pannable zoomable width={120} height={80} nodeClass={minimapNodeClass} />
		<DiagramOptionsPanel {kind} {fullscreen} {container} />
		<LegendPanel {graph} {kind} />
		<PanelFit {container} />
		<DisclosureCard {disclosure} />
	</SvelteFlow>
</div>

<style>
	.interactive { height: 60vh; min-height: 320px; }
	/* A webview iframe is not granted the Fullscreen API, so the overlay is drawn, not requested. */
	.interactive.fullscreen {
		position: fixed;
		inset: 0;
		width: 100vw;
		height: 100vh;
		z-index: 1000;
		background: var(--bg);
	}
	.interactive :global(.svelte-flow) { background: var(--bg); }
	.interactive :global(.svelte-flow__edge-text) { font-size: 11px; fill: var(--fg); }
	.interactive :global(.svelte-flow__minimap-node.minimap-cluster) {
		fill: transparent;
		stroke: var(--border);
	}
	.interactive :global(.svelte-flow__edge-textbg) { fill: var(--card); }
</style>
