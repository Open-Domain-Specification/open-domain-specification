<script lang="ts">
import { type Node, ViewportPortal } from "@xyflow/svelte";
import type { GraphNode } from "./graph";
import { nodeSize } from "./layout";
import { type Backdrop, type SketchNode, sketchBackdrop } from "./voronoi";

/**
 * The sketch style's backdrop, drawn in flow coordinates under the nodes: a
 * solid organic blob round the whole map, dashed Voronoi boundaries between
 * groups and a muted label per group. It follows the nodes it is given, so
 * dragging one reshapes the regions. Cluster nodes are layout-only here.
 */
let {
	nodes,
	groupLabels,
	padding = 36,
}: {
	nodes: Node[];
	groupLabels: Map<string, string>;
	padding?: number;
} = $props();
/** Absolute position of a node: Svelte Flow keeps children relative to their parent. */
const absolute = (n: Node): { x: number; y: number } => {
	const parent = n.parentId
		? nodes.find((p) => p.id === n.parentId)
		: undefined;
	if (!parent) return n.position;
	const o = absolute(parent);
	return { x: o.x + n.position.x, y: o.y + n.position.y };
};
const boxes = $derived<SketchNode[]>(
	nodes
		.filter((n) => n.type !== "cluster")
		.map((n) => {
			const fallback = nodeSize(n.data as unknown as GraphNode);
			return {
				id: n.id,
				...absolute(n),
				width: n.measured?.width ?? fallback.width,
				height: n.measured?.height ?? fallback.height,
				groupId: n.parentId,
			};
		}),
);
/**
 * A cheap fingerprint of the boxes' identity and rounded geometry: Svelte
 * Flow hands `nodes` a fresh array on every drag frame, even ones where
 * nothing moved, so comparing `boxes` by reference would recompute the
 * backdrop far more often than it actually changes.
 */
const fingerprint = $derived(
	boxes
		.map(
			(b) =>
				`${b.id}:${Math.round(b.x)}:${Math.round(b.y)}:${Math.round(b.width)}:${Math.round(b.height)}`,
		)
		.join("|"),
);
let lastFingerprint = "";
let lastPadding: number | undefined;
let cachedBackdrop: Backdrop = { blob: "", boundaries: "", labels: [] };
/** Recomputed only when the fingerprint or padding actually changes. */
const backdrop = $derived.by(() => {
	if (fingerprint !== lastFingerprint || padding !== lastPadding) {
		lastFingerprint = fingerprint;
		lastPadding = padding;
		cachedBackdrop = sketchBackdrop(boxes, padding);
	}
	return cachedBackdrop;
});
const clipId = `sketch-clip-${Math.random().toString(36).slice(2, 8)}`;
</script>

<ViewportPortal target="back">
	<svg class="sketch-backdrop" overflow="visible" width="1" height="1" aria-hidden="true">
		<defs>
			<clipPath id={clipId}><path d={backdrop.blob} /></clipPath>
		</defs>
		<path class="blob" d={backdrop.blob} />
		<path class="boundaries" d={backdrop.boundaries} clip-path={`url(#${clipId})`} />
		{#each backdrop.labels as label (label.id)}
			<text class="region-label" x={label.x} y={label.y} text-anchor="middle">{groupLabels.get(label.id) ?? label.id}</text>
		{/each}
	</svg>
</ViewportPortal>

<style>
	.sketch-backdrop { position: absolute; top: 0; left: 0; overflow: visible; pointer-events: none; }
	.blob {
		fill: color-mix(in srgb, var(--card) 60%, transparent);
		stroke: var(--fg);
		stroke-width: 2.5px;
		stroke-opacity: 0.45;
		stroke-linejoin: round;
	}
	.boundaries {
		fill: none;
		stroke: var(--fg);
		stroke-width: 2px;
		stroke-opacity: 0.35;
		stroke-dasharray: 10 8;
		stroke-linecap: round;
	}
	.region-label {
		fill: var(--muted);
		font-size: 13px;
		font-style: italic;
		letter-spacing: 0.04em;
		paint-order: stroke;
		stroke: var(--bg);
		stroke-width: 4px;
		stroke-linejoin: round;
	}
</style>
