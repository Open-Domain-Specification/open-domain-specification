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
import Keyword from "../Keyword.svelte";
import Lockup from "../Lockup.svelte";

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

<span class="context" {title}>
	<Lockup kind="boundedcontext" name={context.name} ref={context.ref} />
	{#if context.bigBallOfMud}
		<Keyword text={MUD.label} tone="warn" title={MUD.title} />
	{/if}
</span>

<style>
	.context {
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
		min-width: 0;
	}
</style>
