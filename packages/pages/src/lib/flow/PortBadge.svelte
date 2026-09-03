<script lang="ts">
import { EdgeLabel } from "@xyflow/svelte";

/**
 * A port drawn by an edge at one of its ends: a pill on the node border with
 * the short characterisation of that end (a role, a pattern, a cardinality)
 * and the full name as a tooltip. It is an edge label, so it sits above every
 * edge line and matches the port handles nodes draw themselves.
 */
let {
	x,
	y,
	label,
	title = label,
	class: className = "",
}: {
	x: number;
	y: number;
	label: string;
	title?: string;
	class?: string;
} = $props();
</script>

<EdgeLabel {x} {y} class={`port ${className}`} {title} data-x={x} data-y={y}>
	<span class="port-label">{label}</span>
</EdgeLabel>
