<script lang="ts">
import { type Edge, type Node, Position, SvelteFlow } from "@xyflow/svelte";
import "@xyflow/svelte/dist/style.css";
import type { Component } from "svelte";
import type { ContextEdgeData } from "./flow-nodes";

/**
 * One edge component inside a real flow: node `#/a` with a source handle at
 * (10, 20) and node `#/b` with a target handle at (200, 80), declared rather
 * than measured so the edge renders in jsdom too. Tests and stories pick the
 * component and the props that vary; each handle takes the id the edge
 * names for its end, if any.
 */
let {
	edge,
	type = "edge",
	label = undefined,
	markerEnd = undefined,
	style = undefined,
	data = undefined,
	sourcePosition = Position.Right,
	targetPosition = Position.Left,
	targetHandleId = undefined,
	sourceHandleId = undefined,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: any edge component from the registry
	edge: Component<any>;
	type?: string;
	label?: string;
	markerEnd?: string;
	style?: string;
	data?: ContextEdgeData;
	sourcePosition?: Position;
	targetPosition?: Position;
	targetHandleId?: string | null;
	sourceHandleId?: string | null;
} = $props();
/** A zero-size handle, so its declared point is the edge's end whatever side it faces. */
const handle = (
	kind: "source" | "target",
	position: Position,
	x: number,
	y: number,
	id?: string,
) => ({ type: kind, position, x, y, width: 0, height: 0, id });
// svelte-ignore state_referenced_locally
let nodes = $state.raw<Node[]>([
	{
		id: "#/a",
		position: { x: 0, y: 0 },
		width: 100,
		height: 50,
		data: { label: "a" },
		handles: [
			handle("source", sourcePosition, 10, 20, sourceHandleId ?? undefined),
		],
	},
	{
		id: "#/b",
		position: { x: 300, y: 120 },
		width: 120,
		height: 60,
		data: { label: "b" },
		handles: [
			handle("target", targetPosition, -100, -40, targetHandleId ?? undefined),
		],
	},
]);
// svelte-ignore state_referenced_locally
let edges = $state.raw<Edge[]>([
	{
		id: "e",
		type,
		source: "#/a",
		target: "#/b",
		sourceHandle: sourceHandleId ?? undefined,
		targetHandle: targetHandleId ?? undefined,
		label,
		markerEnd,
		style,
		data,
	},
]);
// svelte-ignore state_referenced_locally
const edgeTypes = { [type]: edge };
</script>

<div style="height: 300px">
	<SvelteFlow bind:nodes bind:edges {edgeTypes} />
</div>
