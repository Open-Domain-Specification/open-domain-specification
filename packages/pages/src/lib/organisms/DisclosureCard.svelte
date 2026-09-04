<script lang="ts">
import { ViewportPortal } from "@xyflow/svelte";
import type { Disclosure } from "../flow/disclosure.svelte";
import RelationshipDetail from "./RelationshipDetail.svelte";

/**
 * The relationship detail opened from a map badge (RFC-002 section 4.2),
 * drawn inside the flow viewport at the badge's own flow coordinates so it
 * pans, zooms and goes fullscreen with the map instead of floating over the
 * page. Nothing renders while no badge has been clicked.
 *
 * `pointerdown` stops here, which is what lets the disclosure treat every
 * pointer that reaches the window as a click somewhere else.
 */
const { disclosure }: { disclosure: Disclosure } = $props();
</script>

{#if disclosure.open}
	{@const card = disclosure.open}
	<ViewportPortal target="front">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="anchored" style:transform={`translate(${card.x}px, ${card.y}px)`} onpointerdown={(e) => e.stopPropagation()}>
			<button class="close" type="button" aria-label="Close" onclick={disclosure.close}>
				<i class="codicon codicon-close"></i>
			</button>
			<RelationshipDetail relationship={card.relationship} />
		</div>
	</ViewportPortal>
{/if}

<style>
	/* The viewport portal and the edge-label layer are siblings with no z-index,
	   so DOM order would draw the badges through the card; lift it above both.
	   It is capped rather than sized so a relationship with a long comment list
	   scrolls inside the diagram instead of growing past it. */
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
