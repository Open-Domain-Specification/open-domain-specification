<script lang="ts">
import { EdgeLabel } from "@xyflow/svelte";

/**
 * A badge an edge draws at a point on itself: a pill with the short
 * characterisation of that point (a role, a stereotype, a pattern, a
 * cardinality) and the full name as a tooltip. It is an edge label, so it sits
 * above every edge line and matches the port handles nodes draw themselves.
 *
 * `mark` is what the architecture thinks of the intent under the badge, which
 * the stylesheet turns into the warning colour or an outline. A badge with an
 * `onclick` becomes a button and takes pointer events; without one it stays
 * the inert pill it has always been.
 */
let {
	x,
	y,
	label,
	title = label,
	mark = "",
	onclick,
	class: className = "",
}: {
	x: number;
	y: number;
	label: string;
	title?: string;
	mark?: string;
	onclick?: (at: { x: number; y: number }) => void;
	class?: string;
} = $props();

const classes = $derived(
	["port", className, mark, onclick && "intent"].filter(Boolean).join(" "),
);
</script>

<EdgeLabel {x} {y} class={classes} {title} data-x={x} data-y={y}>
	{#if onclick}
		<button type="button" class="port-label" aria-label={`Evidence for ${title}`} onclick={() => onclick({ x, y })}>{label}</button>
	{:else}
		<span class="port-label">{label}</span>
	{/if}
</EdgeLabel>
