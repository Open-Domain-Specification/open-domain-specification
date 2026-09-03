<script lang="ts">
import {
	type ContextRelationship,
	ODSContextMap,
	PATTERNS,
} from "@open-domain-specification/core";
import {
	Background,
	Controls,
	type Edge,
	MiniMap,
	type Node,
	SvelteFlow,
	ViewportPortal,
} from "@xyflow/svelte";
import "@xyflow/svelte/dist/style.css";
import { flowEdges, flowNodes } from "../flow/flow-nodes";
import { contextGraph } from "../flow/graph";
import { layout } from "../flow/layout";
import { minimapNodeClass } from "../flow/minimap";
import { nodeTypes } from "../flow/registry";
import { hostColorMode } from "../flow/theme.svelte";
import { useModel } from "../model";
import RelationshipDetail from "../organisms/RelationshipDetail.svelte";
import DispositionEdge, {
	type DispositionEdgeData,
} from "./DispositionEdge.svelte";
import DispositionLegend from "./DispositionLegend.svelte";
import { dispositionOf } from "./derive";
import { type CommentSheetIndex, sheetForRelationship } from "./fixtures";

/**
 * The context map of RFC-002 section 4.2, wired for Storybook: disposition
 * marks on the role badges, a hover summary on each, and a click that opens
 * the relationship detail as a card anchored to the badge inside the diagram,
 * so it pans, zooms and survives fullscreen with the map.
 *
 * It builds its own flow rather than reusing `InteractiveDiagram` because the
 * shipped diagram draws from the shared edge registry and nothing here may
 * change what shipped pages render.
 */
const { sheets }: { sheets: CommentSheetIndex } = $props();

const model = useModel();
const graph = $derived(
	contextGraph(ODSContextMap.fromWorkspace(model.workspace)),
);
const positioned = $derived(layout(graph, "LR"));

/** The relationship an edge stands for, matched on its unordered pair of contexts. */
const relationshipFor = (edge: Edge): ContextRelationship | undefined =>
	model.workspace.relationships.find(
		(r) =>
			(r.source.ref === edge.source && r.target.ref === edge.target) ||
			(r.source.ref === edge.target && r.target.ref === edge.source),
	);

/** The hover line for a badge: what the pattern means, then what we know. */
const summaryFor = (r: ContextRelationship) => {
	const sheet = sheetForRelationship(sheets, r);
	const first = sheet?.comments[0]?.text;
	return [PATTERNS[r.type].summary, first ?? "No comments recorded yet."].join(
		" ",
	);
};

let open = $state<{ r: ContextRelationship; x: number; y: number } | undefined>(
	undefined,
);

let nodes = $state.raw<Node[]>([]);
let edges = $state.raw<Edge[]>([]);
$effect(() => {
	nodes = flowNodes(positioned, {
		floating: true,
		sketch: false,
		free: true,
	});
	edges = flowEdges(positioned).map((edge) => {
		const r = relationshipFor(edge);
		if (!r) return edge;
		const data: DispositionEdgeData = {
			...(edge.data as DispositionEdgeData),
			disposition: dispositionOf(sheetForRelationship(sheets, r)),
			summary: summaryFor(r),
			onBadgeClick: (at) => {
				open = { r, x: at.x, y: at.y };
			},
		};
		return { ...edge, data };
	});
});
const dispositions = $derived(
	model.workspace.relationships.map((r) =>
		dispositionOf(sheetForRelationship(sheets, r)),
	),
);
</script>

<div class="interactive">
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		edgeTypes={{ context: DispositionEdge }}
		fitView
		fitViewOptions={{ padding: 0.25 }}
		minZoom={0.2}
		colorMode={hostColorMode.value}
		nodesConnectable={false}
		elementsSelectable={false}
	>
		<Background />
		<Controls showLock={false} />
		<MiniMap pannable zoomable width={120} height={80} nodeClass={minimapNodeClass} />
		<DispositionLegend {graph} kind="context" {dispositions} />
		{#if open}
			<ViewportPortal target="front">
				<div class="anchored" style="transform: translate({open.x}px, {open.y}px)">
					<button class="close" type="button" aria-label="Close" onclick={() => { open = undefined; }}>
						<i class="codicon codicon-close"></i>
					</button>
					<RelationshipDetail relationship={open.r} {sheets} />
				</div>
			</ViewportPortal>
		{/if}
	</SvelteFlow>
</div>

<style>
	.interactive {
		height: 70vh;
		min-height: 360px;
	}
	.interactive :global(.svelte-flow) {
		background: var(--bg);
	}
	.interactive :global(.svelte-flow__edge-text) {
		font-size: 11px;
		fill: var(--fg);
	}
	/* The viewport portal and the edge-label layer are siblings with no z-index,
	   so DOM order would draw labels through the card; lift it above both. */
	.anchored {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 10;
		width: 420px;
		max-width: 60vw;
		max-height: 60vh;
		overflow: auto;
		font-size: 12px;
		background: var(--card, var(--bg));
		border-radius: var(--radius);
		filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.35));
	}
	.close {
		position: absolute;
		top: 4px;
		right: 4px;
		z-index: 1;
		background: none;
		border: 0;
		color: var(--muted);
		cursor: pointer;
	}
</style>
