<script lang="ts">
import {
	type Evidenced,
	PATTERNS,
	type PatternKey,
} from "@open-domain-specification/core";
import { onDestroy } from "svelte";
import Comments from "../atoms/Comments.svelte";
import Disposition from "../atoms/Disposition.svelte";
import HoverCard from "../atoms/HoverCard.svelte";
import Keyword from "../atoms/Keyword.svelte";
import { hasEvidence } from "../evidence/derive";
import { createHover } from "./hover.svelte";
import { placeHover } from "./hover-placement";

/**
 * One pattern keyword, and what it means, disclosed on hover (RFC-002
 * section 4).
 *
 * The keyword on its own is a code — `OHS`, `ACL`, `customer-supplier` — and
 * a native `title` cannot carry links or the Problems-panel disposition mark,
 * so this is the editor's hover widget instead: the `HoverCard` frame, with
 * the pattern as its heading. It teaches the term first, in core's words, and
 * only then says what this particular relationship has recorded against it, so
 * a reader who does not know the pattern and a reader who wants the evidence
 * both get what they came for, in that order. The rule under the meaning is
 * where the hover stops being about the word and starts being about this
 * relationship, which is the split the frame's `<hr>` is for.
 *
 * The card is placed in viewport coordinates from the trigger's position when
 * it opens (`hover-placement.ts`), which is how the editor's hover widget
 * places itself: no frame around the trigger, a table's scroll frame
 * included, can clip it, and it stays a DOM child of the trigger's root so
 * pinning, Escape and the outside-click test are unchanged. A page renders in
 * a VS Code webview, a static export and Storybook, and each is its own
 * viewport, so this behaves the same in all three.
 */
const {
	pattern,
	label,
	mono = false,
	intent,
}: {
	pattern: PatternKey;
	/** Keyword text; the pattern's abbreviation unless the surface spells it out. */
	label?: string;
	/** Set the keyword in the editor font, as a role code on a table is. */
	mono?: boolean;
	/** The relationship this keyword was read off, whose evidence the card discloses. */
	intent?: Evidenced;
} = $props();

const nature = $derived(PATTERNS[pattern]);
/**
 * The frame's heading: the full name with the code beside it, so a reader who
 * only ever sees `ACL` learns what those letters stand for. Built here rather
 * than interpolated into the attribute, which compiles to nullish branches
 * this component can never take.
 */
const heading = $derived(`${nature.name} (${nature.abbreviation})`);
let root = $state<HTMLElement>();
let trigger = $state<HTMLElement>();
const hover = createHover(() => root);
onDestroy(hover.stop);

/** Places the card layer the moment it exists, against where the word is now. */
const placeLayer = (layer: HTMLElement) => {
	const anchor = (trigger as HTMLElement).getBoundingClientRect();
	const { width, height } = layer.getBoundingClientRect();
	const { clientWidth, clientHeight } = document.documentElement;
	const at = placeHover(
		anchor,
		{ width, height },
		{ width: clientWidth, height: clientHeight },
	);
	layer.style.top = `${at.top}px`;
	layer.style.left = `${at.left}px`;
	if (at.maxHeight !== undefined) layer.style.maxHeight = `${at.maxHeight}px`;
};
</script>

<span
	class="pattern-hover"
	bind:this={root}
	onmouseenter={hover.hover}
	onmouseleave={hover.unhover}
	onfocusin={hover.focus}
	role="presentation"
>
	<button
		type="button"
		class="trigger"
		bind:this={trigger}
		aria-expanded={hover.open}
		onclick={hover.pin}
	><Keyword text={label ?? nature.abbreviation} {mono} /></button>
	{#if hover.open}
		<span class="layer" use:placeLayer>
			<HoverCard {heading}>
				<p>{nature.summary}</p>
				<!-- The trade-offs stay on the docs site; a hover is one thought.
				     A span, not a second `p`: the frame flattens paragraph margins
				     so its own parts sit tight, and the gap belongs here. -->
				<span class="nature">{nature.architecturalNature}</span>
				{#if intent && hasEvidence(intent)}
					<hr />
					<Disposition disposition={intent.disposition} />
					{#if intent.comments.length}
						<Comments comments={intent.comments} />
					{/if}
				{/if}
			</HoverCard>
		</span>
	{/if}
</span>

<style>
	/* The trigger exists to take focus and a click; it must leave the keyword
	   looking exactly like the keywords beside it that have nothing to say. */
	.trigger {
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		padding: 0;
		cursor: help;
		border-radius: 2px;
	}
	/* No hover colour on the word itself: the design language settled that a
	   keyword with a meaning to reveal gives the help cursor and nothing else,
	   and the card appearing under it is the feedback. Recolouring it would
	   also mean reaching through `Keyword`'s own class from out here. */
	.trigger:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: 1px;
	}
	/* Over everything else, at the viewport position `placeLayer` gives it, and
	   never inheriting the `nowrap` a table cell sets on its content. The 4px
	   between the word and the card is padding, not a gap, so the pointer can
	   cross into the card without leaving the disclosure; it sits on both
	   sides so the card can open above the word as well as under it. Wider
	   than the viewport it narrows; taller than its room it scrolls. */
	.layer {
		position: fixed;
		z-index: 20;
		top: 0;
		left: 0;
		box-sizing: border-box;
		display: block;
		padding: 4px 0;
		width: max-content;
		max-width: min(60ch, calc(100vw - 16px));
		overflow-y: auto;
		text-align: left;
		white-space: normal;
		/* The keyword may sit in a heading; the card it opens is body text
		   wherever it is opened from, as the editor's hover always is. */
		font-size: var(--vscode-font-size, 13px);
		font-weight: 400;
	}
	.nature {
		display: block;
		margin-top: 4px;
		color: var(--vscode-descriptionForeground);
	}
</style>
