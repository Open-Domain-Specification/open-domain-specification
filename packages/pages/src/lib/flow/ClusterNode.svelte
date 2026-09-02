<script lang="ts">
import type { NodeProps } from "@xyflow/svelte";

/**
 * A namespace cluster: the shaded region behind its member nodes with the
 * label at the top left, as the Graphviz images draw them. Nested clusters
 * get lighter with depth so each level stays readable through its parent.
 */
let {
	data,
	width,
	height,
}: NodeProps & { data: { label: string; depth: number } } = $props();
const alpha = $derived(Math.max(0.04, 0.14 - data.depth * 0.03));
const style = $derived(
	`width: ${width}px; height: ${height}px; --shade: ${alpha}`,
);
</script>

<div class="cluster-node" {style} data-depth={data.depth}>
	<span class="cluster-label">{data.label}</span>
</div>

<style>
	.cluster-node {
		background: rgb(128 128 128 / var(--shade));
		border-radius: 8px;
		pointer-events: none;
		box-sizing: border-box;
	}
	.cluster-label {
		position: absolute;
		top: 4px;
		left: 8px;
		font-size: 10px;
		color: var(--muted);
		white-space: nowrap;
	}
</style>
