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
 * The card is positioned against the trigger inside the page flow rather than
 * in a portal: a page renders in a VS Code webview, a static export and
 * Storybook, and only flow positioning behaves the same in all three.
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
const hover = createHover(() => root);
onDestroy(hover.stop);
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
		aria-expanded={hover.open}
		onclick={hover.pin}
	><Keyword text={label ?? nature.abbreviation} {mono} /></button>
	{#if hover.open}
		<span class="layer">
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
	.pattern-hover {
		position: relative;
		display: inline-block;
	}
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
	/* Under the keyword, over everything else, and never inheriting the
	   `nowrap` a table cell sets on its content. */
	.layer {
		position: absolute;
		z-index: 20;
		top: calc(100% + 4px);
		left: 0;
		display: block;
		width: max-content;
		max-width: 60ch;
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
