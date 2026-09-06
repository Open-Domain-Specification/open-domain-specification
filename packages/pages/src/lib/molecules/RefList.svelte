<script lang="ts">
import Keyword from "../atoms/Keyword.svelte";
import type { Kind } from "../atoms/kinds";
import Ref from "../atoms/Ref.svelte";
import { ICONS, nameOf } from "../model";

/**
 * A short list of links, comma-separated. v1 gave each one a pill; in v2 a
 * link looks like a link and the commas do the separating, which is what the
 * editor does wherever it lists related symbols. When there is nothing to
 * list the caller's word takes its place, in the secondary colour, because a
 * cell that says `none` reads better than an empty one. `block` is for the
 * standalone case, where the list is the whole content of a section and needs
 * the row's padding; inside a table cell it is inline.
 */
const {
	items,
	kind,
	empty = "none",
	block = false,
}: {
	items: { ref: string; name?: string }[];
	kind?: Kind;
	empty?: string;
	block?: boolean;
} = $props();
</script>

{#snippet list()}{#each items as item, i (item.ref)}{#if i}, {/if}<Ref
			ref={item.ref}
			label={nameOf(item)}
			icon={kind ? ICONS[kind] : undefined}
			{kind}
		/>{:else}<Keyword text={empty} />{/each}{/snippet}

{#if block}<p class="refs">{@render list()}</p>{:else}{@render list()}{/if}

<style>
	.refs {
		margin: 0;
		padding: 0 8px;
		line-height: 22px;
	}
</style>
