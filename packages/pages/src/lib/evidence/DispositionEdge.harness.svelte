<script lang="ts">
import { type Edge, type Node, Position, SvelteFlow } from "@xyflow/svelte";
import "@xyflow/svelte/dist/style.css";
import DispositionEdge, {
	type DispositionEdgeData,
} from "./DispositionEdge.svelte";

/**
 * One disposition edge inside a real flow, the same shape as the shipped
 * `EdgeHarness` but with the evidence data the edge reads. Node `#/a` has a
 * source handle at (10, 20) and `#/b` a target handle at (200, 80), declared
 * rather than measured so the edge renders in jsdom too.
 */
let {
	label = undefined,
	style = undefined,
	data = undefined,
}: {
	label?: string;
	style?: string;
	data?: DispositionEdgeData;
} = $props();

const handle = (
	kind: "source" | "target",
	position: Position,
	x: number,
	y: number,
) => ({ type: kind, position, x, y, width: 0, height: 0 });
// svelte-ignore state_referenced_locally
let nodes = $state.raw<Node[]>([
	{
		id: "#/a",
		position: { x: 0, y: 0 },
		width: 100,
		height: 50,
		data: { label: "a" },
		handles: [handle("source", Position.Right, 10, 20)],
	},
	{
		id: "#/b",
		position: { x: 300, y: 120 },
		width: 120,
		height: 60,
		data: { label: "b" },
		handles: [handle("target", Position.Left, -100, -40)],
	},
]);
// svelte-ignore state_referenced_locally
let edges = $state.raw<Edge[]>([
	{
		id: "e",
		type: "context",
		source: "#/a",
		target: "#/b",
		label,
		style,
		data,
	},
]);
</script>

<div style="height: 300px">
	<SvelteFlow bind:nodes bind:edges edgeTypes={{ context: DispositionEdge }} />
</div>
