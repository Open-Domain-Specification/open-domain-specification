<script module lang="ts">
/** The one word the model says about an incoherent context, and what it means. */
export const MUD = {
	label: "big ball of mud",
	title:
		"A model that is not coherent; neighbours should protect themselves with an anti-corruption layer.",
};
</script>

<script lang="ts">
import type { BoundedContext } from "@open-domain-specification/core";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";

/**
 * A bounded context wherever it is named in a row: the class symbol in its
 * Outline colour, the name as a link, and — for a context the model calls a
 * big ball of mud — the warning word after it. v1 drew a pill around the pair
 * and a second pill for the warning; here the lockup is the link and the
 * warning is the one word a reader has to see.
 */
const {
	context,
	title,
}: {
	context: BoundedContext;
	/** Hover text for the row's meaning; the strategic position puts its generated sentence here. */
	title?: string;
} = $props();
</script>

<!-- Inline, not a flex box, and no whitespace between the two: each is a
     whole token, and whether a line may break between them is the cell's
     decision (a narrow table lets its cells wrap between tokens, so the
     warning word drops under the name instead of holding the column open),
     never this component's. -->
<span class="context" {title}><span class="name"><Lockup kind="boundedcontext" name={context.name} ref={context.ref} /></span>{#if context.bigBallOfMud}<Keyword text={MUD.label} tone="warn" title={MUD.title} />{/if}</span>

<style>
	/* The gap sits after the name, so a warning word that wraps under it
	   starts at the cell's edge rather than 8px in. */
	.name {
		margin-right: 8px;
	}
</style>
