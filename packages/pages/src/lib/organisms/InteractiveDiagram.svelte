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
import { onDestroy, tick } from "svelte";
import { fitClusters } from "../flow/cluster-fit";
import DiagramOptionsPanel from "../flow/DiagramOptionsPanel.svelte";
import DoubleClickZoom from "../flow/DoubleClickZoom.svelte";
import { createDisclosure, withDisclosure } from "../flow/disclosure.svelte";
import FitViewButton from "../flow/FitViewButton.svelte";
import { createDiagramFit } from "../flow/fit.svelte";
import {
	flowEdges,
	flowNodes,
	groupLabels,
	opensPage,
} from "../flow/flow-nodes";
import { createFullscreen } from "../flow/fullscreen.svelte";
import type { Graph } from "../flow/graph";
import { diagramKind, sketchApplies } from "../flow/kind";
import LegendPanel from "../flow/LegendPanel.svelte";
import { layout } from "../flow/layout";
import { minimapNodeClass } from "../flow/minimap";
import { diagramOptions } from "../flow/options.svelte";
import PanelFit from "../flow/PanelFit.svelte";
import { PANEL_GUTTER } from "../flow/panel-fit";
import { edgeTypes, nodeTypes } from "../flow/registry";
import SketchBackdrop from "../flow/SketchBackdrop.svelte";
import { hostColorMode } from "../flow/theme.svelte";
import { focusArrival } from "../focus";
import { createReducedMotion } from "../motion.svelte";
import { modelRefToHash } from "../ref-transport";
import DisclosureCard from "./DisclosureCard.svelte";

/** Svelte Flow's own ceiling, which the diagram never overrides. */
const MAX_ZOOM = 2;

/**
 * What Svelte Flow tells a screen reader about a node, in words that are true
 * here: nothing on these maps is selected, moved or deleted, a node opens its page.
 * Edges are not tab stops at all (`edgesFocusable={false}` below): clicking a line does
 * nothing on any of the four maps, and the badges on a context edge are their own buttons,
 * so a stop on the line would announce "select an edge" for an action that does not exist.
 */
const NODE_KEYS = {
	"node.a11yDescription.default": "Press enter or space to open its page.",
	"node.a11yDescription.keyboardDisabled":
		"Press enter or space to open its page.",
};

/**
 * A pannable, zoomable version of a figure. Nodes are refs, so clicking one
 * navigates. The figure can be blown up to a full-viewport overlay, which is
 * how a large map is explored from a cramped editor split.
 * The map's kind decides the style: only the context map takes
 * the sketch backdrop, and only there can a node be dragged out of its
 * cluster, the backdrop (or, in the cards style, the cluster boxes)
 * following it.
 */
let {
	graph,
	direction = "LR",
	caption,
}: {
	graph: Graph;
	direction?: "LR" | "TB";
	/** The figure's caption, which names the bypass. A diagram outside a figure has no caption and no bypass. */
	caption?: string;
} = $props();
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
/**
 * The panels and the zoom floor this diagram fits with. The fit can
 * close a panel to keep the map readable; the reader can open it again.
 */
const fit = createDiagramFit();
/** Measured by the panel-aware fit, so it needs the box the panels float over. */
let container = $state<HTMLElement>();
onDestroy(fullscreen.stop);
onDestroy(disclosure.stop);
/**
 * Every viewport change this diagram makes itself (the initial fit, the panel-aware refit,
 * the Fit View and zoom controls, a focused node panned into view) is called without a
 * duration, so it is immediate whatever the preference. The one animation left is the
 * library's own double-click zoom, an eased transition it does not let a caller shorten,
 * so under reduced motion the library's gesture is off and `DoubleClickZoom` does the same
 * step immediately.
 */
const motion = createReducedMotion();
onDestroy(motion.stop);
/** What a click on a node does, and so what Enter and Space do on the focused one. */
const open = (id: string) => {
	if (!opensPage(id)) return;
	fullscreen.exit();
	location.hash = modelRefToHash(id);
};
/**
 * The bypass: every node, badge and control on the map is a Tab stop, so the
 * first stop inside the diagram is a button that leaves it. It focuses the
 * figure's caption, which is the last thing in the figure and not a stop of
 * its own, so the next Tab is the first control after the diagram. In
 * fullscreen the page behind is covered, so one activation leaves the overlay
 * first and focuses the caption once it is gone and visible.
 */
const skipDiagram = async (event: MouseEvent) => {
	const button = event.currentTarget as HTMLElement;
	const figure = button.closest("figure");
	fullscreen.exit();
	await tick();
	const target = figure?.querySelector<HTMLElement>("figcaption");
	if (target) focusArrival(target);
};
/**
 * Svelte Flow selects a node on Enter and Space, and this diagram has nothing
 * to select: its nodes are pages. So the keys go where a click goes. Only a
 * key pressed on the node itself counts; one pressed on a control inside it
 * is that control's own.
 */
const onKeydown = (event: KeyboardEvent) => {
	if (event.key !== "Enter" && event.key !== " ") return;
	const target = event.target as HTMLElement;
	if (!target.classList.contains("svelte-flow__node") || !target.dataset.id)
		return;
	event.preventDefault();
	open(target.dataset.id);
};
/**
 * Svelte Flow decides whether a drag event moved a node by comparing the position it works
 * out (the pointer, less the parent's absolute origin) with the one it kept from the last
 * event. `fitClusters` moves a cluster's origin with the node dragged out of it, which
 * changes that relative position under Svelte Flow's feet: at a steady pace, as when the
 * canvas auto-pans under a held pointer, the next position equals the stale one, the event
 * is dropped and the node stalls a frame. Each event's `nodes` carry the live position
 * object Svelte Flow keeps, so the fitted position is written into it; the release then
 * writes back the fitted position too, where the stale one used to jump the node a step.
 *
 * That alias is undocumented. In `@xyflow/system` 0.0.82 (reached through `@xyflow/svelte`
 * 1.6.6, which pins it exactly), `getEventHandlerParams` builds each event node's
 * `position` as a reference to the drag's private `dragItem.position`, so writing the
 * fitted position into `m.position` updates that cache. No documented API reaches it:
 * `updateNode` writes the store node, which the drag stop then overwrites. The guard on an
 * upgrade is the two regressions in `e2e/diagrams-sketch.spec.ts`, "on a context map the
 * canvas auto-pans a node dragged to its edge and the boxes stay with it" (held edge) and
 * "on a context map a node that is alone in its cluster stays under a held pointer in the
 * bottom-right corner and does not move when the pointer is let go" (sole member, corner).
 * An upgrade that breaks the alias makes them fail rather than silently no-op.
 */
const refitDrag = ({ nodes: moved }: { nodes: Node[] }) => {
	if (kind !== "context") return;
	nodes = fitClusters(nodes);
	for (const m of moved) {
		const fitted = nodes.find((n) => n.id === m.id);
		if (fitted) Object.assign(m.position, fitted.position);
	}
};
/** Free maps (context maps) refit their cluster boxes once more when a dragged node is released. */
const refit = () => {
	if (kind === "context") nodes = fitClusters(nodes);
};
</script>

<!-- `data-fit` names the step of relief the fit had to take; the e2e reads it. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="interactive" onkeydown={onKeydown} class:fullscreen={fullscreen.active} data-fit={fit.step} bind:this={container}>
	{#if caption}<button type="button" class="bypass" onclick={skipDiagram}>Skip diagram: {caption}</button>{/if}
	<SvelteFlow bind:nodes bind:edges {nodeTypes} {edgeTypes} fitView fitViewOptions={{ padding: `${PANEL_GUTTER}px` }} minZoom={fit.minZoom} colorMode={hostColorMode.value} nodesConnectable={false} elementsSelectable={false} zoomOnDoubleClick={!motion.reduced} edgesFocusable={false} onnodeclick={({ node }) => open(node.id)} ariaLabelConfig={NODE_KEYS} onnodedrag={refitDrag} onnodedragstop={refit}>
		<Background />
		{#if sketch}<SketchBackdrop {nodes} groupLabels={labels} />{/if}
		<Controls showLock={false} showFitView={false}><FitViewButton {container} {fit} /></Controls>
		<MiniMap pannable zoomable width={120} height={80} nodeClass={minimapNodeClass} />
		<DiagramOptionsPanel {kind} {fullscreen} panel={fit.options} />
		<LegendPanel {graph} {kind} legend={fit.legend} />
		<PanelFit {container} {fit} fullscreen={fullscreen.active} />
		<DoubleClickZoom {container} reduced={motion.reduced} minZoom={fit.minZoom} maxZoom={MAX_ZOOM} />
		<DisclosureCard {disclosure} />
	</SvelteFlow>
</div>

<style>
	.interactive { position: relative; height: 60vh; min-height: 320px; }
	/* Hidden until it has focus, then drawn over the map's top-left corner. */
	.bypass:not(:focus) {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.bypass:focus {
		position: absolute;
		top: 8px;
		left: 8px;
		z-index: 20;
		padding: 4px 12px;
		line-height: 22px;
		color: var(--vscode-foreground);
		background: var(--vscode-editor-background);
		border: 1px solid var(--vscode-focusBorder);
		border-radius: 2px;
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: -1px;
		cursor: pointer;
	}
	/* A webview iframe is not granted the Fullscreen API, so the overlay is drawn, not requested.
	   `inset: 0` alone sizes it to the viewport a reader sees: `100vw` counts a classic
	   scrollbar's width too, and the fit drew nodes behind it (#86, Linux webview). */
	.interactive.fullscreen {
		position: fixed;
		inset: 0;
		height: auto;
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
