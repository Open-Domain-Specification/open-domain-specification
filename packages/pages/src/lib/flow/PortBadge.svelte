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
 *
 * That button discloses a card, so it says so the way any disclosure control
 * does: it is named for what it shows ("Show evidence for ..."), announces a
 * dialog, and reads as expanded, controlling the card, while its card is open.
 * Enter and Space are the button's own; Escape and the return of focus belong
 * to the card (`disclosure.svelte.ts`).
 */
let {
	x,
	y,
	label,
	title = label,
	mark = "",
	onclick,
	disclosedBy,
	controls,
	class: className = "",
}: {
	x: number;
	y: number;
	label: string;
	title?: string;
	mark?: string;
	onclick?: (at: { x: number; y: number }, invoker: HTMLElement) => void;
	/** The badge whose card is open; this one is expanded when it is itself. */
	disclosedBy?: () => Element | undefined;
	/** The element id of the card this badge opens. */
	controls?: string;
	class?: string;
} = $props();
let button = $state<HTMLButtonElement>();
const expanded = $derived(!!button && disclosedBy?.() === button);
/**
 * The name says what the button does and starts with the text on it, so a
 * reader who speaks the label to reach it is understood. What follows is the
 * hover text, which can run to several lines where a name is one.
 */
const name = $derived(
	title === label
		? `Show evidence for ${label}`
		: `Show evidence for ${label}: ${title.replace(/([.!?])?\s*\n\s*/g, (_, end) => `${end ?? "."} `)}`,
);

const classes = $derived(
	["port", className, mark, onclick && "intent"].filter(Boolean).join(" "),
);
</script>

<EdgeLabel {x} {y} class={classes} {title} data-x={x} data-y={y}>
	{#if onclick}
		<button type="button" class="port-label" bind:this={button} aria-label={name} aria-haspopup="dialog" aria-expanded={expanded} aria-controls={expanded ? controls : undefined} onclick={(e) => onclick({ x, y }, e.currentTarget)}>{label}</button>
	{:else}
		<span class="port-label">{label}</span>
	{/if}
</EdgeLabel>
