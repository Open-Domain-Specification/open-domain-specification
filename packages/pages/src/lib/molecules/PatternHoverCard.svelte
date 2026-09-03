<script lang="ts">
import {
	type Evidenced,
	PATTERNS,
	type PatternKey,
} from "@open-domain-specification/core";
import { onDestroy } from "svelte";
import Chip from "../atoms/Chip.svelte";
import DispositionChip from "../atoms/DispositionChip.svelte";
import { hasEvidence } from "../evidence/derive";
import CommentList from "./CommentList.svelte";
import { createHoverCard } from "./hover-card.svelte";

/**
 * One pattern keyword, and what it means, disclosed on hover.
 *
 * The chip on its own is an acronym — `OHS`, `ACL`, `customer-supplier` — and
 * a title tooltip cannot carry links or a disposition chip, so this is a real
 * card. It teaches the term first, in core's words, and only then says what
 * this particular relationship has recorded against it; a reader who does not
 * know the pattern and a reader who wants the evidence both get what they
 * came for, in that order.
 *
 * The card is positioned against the trigger inside the page flow rather than
 * in a portal: a page renders in a VS Code webview, a static export and
 * Storybook, and only flow positioning behaves the same in all three.
 */
const {
	pattern,
	label,
	intent,
}: {
	pattern: PatternKey;
	/** Chip text; the pattern's abbreviation unless the surface spells it out. */
	label?: string;
	/** The relationship this keyword was read off, whose evidence the card discloses. */
	intent?: Evidenced;
} = $props();

const nature = $derived(PATTERNS[pattern]);
let root = $state<HTMLElement>();
const card = createHoverCard(() => root);
onDestroy(card.stop);
</script>

<span
	class="pattern-term"
	bind:this={root}
	onmouseenter={card.hover}
	onmouseleave={card.unhover}
	onfocusin={card.focus}
	role="presentation"
>
	<button
		type="button"
		class="chip muted"
		aria-expanded={card.open}
		onclick={card.pin}
	>{label ?? nature.abbreviation}</button>
	{#if card.open}
		<div class="hover-card">
			<span class="name">{nature.name}</span>
			<Chip label={nature.abbreviation} tone="muted" />
			<span class="summary">{nature.summary}</span>
			<span class="architectural">{nature.architecturalNature}</span>
			{#if intent && hasEvidence(intent)}
				<div class="specifics">
					<DispositionChip disposition={intent.disposition} />
					{#if intent.comments.length}
						<CommentList comments={intent.comments} />
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</span>

<style>
	.pattern-term {
		position: relative;
		display: inline-block;
	}
	button.chip {
		background: none;
		font: inherit;
		font-size: 0.78em;
		cursor: pointer;
	}
	button.chip:hover,
	button.chip:focus-visible {
		color: var(--fg);
		border-color: var(--fg);
	}
	.hover-card {
		position: absolute;
		z-index: 20;
		top: calc(100% + 4px);
		left: 0;
		display: block;
		width: max-content;
		max-width: 42ch;
		padding: 8px 10px;
		text-align: left;
		white-space: normal;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
		color: var(--fg);
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.28);
	}
	.name {
		font-weight: 600;
		margin-right: 4px;
	}
	.summary,
	.architectural {
		display: block;
		margin-top: 4px;
	}
	.architectural {
		color: var(--muted);
	}
	/* The rule is what separates what the keyword means from what this one
	   relationship says about it. */
	.specifics {
		display: block;
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--border);
	}
</style>
