<script lang="ts">
import { type Node, SvelteFlow } from "@xyflow/svelte";
import "@xyflow/svelte/dist/style.css";
import type { Component } from "svelte";

/** Handles only work inside a flow, so a node component is shown within a one-node canvas. */
let {
	node,
	type,
	data,
	width = undefined,
	height = undefined,
}: {
	// biome-ignore lint/suspicious/noExplicitAny: any node component from the registry
	node: Component<any>;
	type: string;
	data: { id?: string } & Record<string, unknown>;
	width?: number;
	height?: number;
} = $props();
// svelte-ignore state_referenced_locally
const nodeTypes = { [type]: node };
// svelte-ignore state_referenced_locally
let nodes = $state.raw<Node[]>([
	{
		id: data.id ?? "n",
		type,
		position: { x: 20, y: 20 },
		data,
		width,
		height,
	},
]);
</script>

<div style="height: 280px">
	<SvelteFlow bind:nodes {nodeTypes} fitView />
</div>
