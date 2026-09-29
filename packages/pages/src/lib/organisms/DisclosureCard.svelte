<script lang="ts">
import { relationshipTitle } from "@open-domain-specification/core";
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
 *
 * It is a dialog, not a modal one: the map behind it stays live, so there is
 * no trap and no scrim. Focus moves onto the card when it opens, as the modal
 * moves it onto its panel, so the next Tab is the card's own content rather
 * than a page the reader can no longer see the place of. The badge's
 * `aria-controls` is this element's id.
 */
const { disclosure }: { disclosure: Disclosure } = $props();

/**
 * Takes focus without scrolling: the card sits inside a viewport that clips
 * it, and a scroll to reveal it would shift the whole map. It is an effect
 * rather than an action on the card because the viewport portal moves its
 * content into place after the content's own actions have run, and an element
 * that is not yet in the document cannot take focus.
 */
let card = $state<HTMLElement>();
$effect(() => card?.focus({ preventScroll: true }));
</script>

{#if disclosure.open}
	{@const shown = disclosure.open}
	<ViewportPortal target="front">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="anchored" id={disclosure.id} role="dialog" aria-label={`Evidence for ${relationshipTitle(shown.relationship)}`} tabindex="-1" bind:this={card} style:transform={`translate(${shown.x}px, ${shown.y}px)`} onpointerdown={(e) => e.stopPropagation()}>
			<button class="close" type="button" aria-label="Close" onclick={disclosure.dismiss}>
				<i class="codicon codicon-close"></i>
			</button>
			<RelationshipDetail relationship={shown.relationship} />
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
	.anchored:focus-visible {
		outline: 1px solid var(--vscode-focusBorder, var(--accent));
	}
	.close:focus-visible {
		outline: 1px solid var(--vscode-focusBorder, var(--accent));
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
