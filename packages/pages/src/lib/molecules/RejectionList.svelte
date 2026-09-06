<script lang="ts">
import type { Rejection } from "@open-domain-specification/core";
import Ref from "../atoms/Ref.svelte";
import { ICONS } from "../model";
import Joined from "./Joined.svelte";

/**
 * The shapes an operation refuses with, comma-separated, each said as "many X"
 * where the refusal is a list of that shape rather than one of it.
 *
 * A list rather than {@link RefList} because a refusal carries the word beside
 * the shape and not on the fact's term: an operation refuses with several
 * shapes and only some of them may be lists, so "Rejects with, many" would be
 * saying it of all of them (decision 13, second amendment of 2026-09-10). The
 * word sits outside the link, as it does in the doc package's table and as
 * "Returns many" does on the fact above.
 */
const { rejections }: { rejections: Rejection[] } = $props();
</script>

<Joined>
	{#each rejections as { schema, many } (schema.ref)}
		<span class="rejection">{#if many}{"many "}{/if}<Ref
				ref={schema.ref}
				label={schema.name}
				icon={ICONS.schema}
				kind="schema"
			/></span>
	{/each}
</Joined>

<style>
	/* Nothing of its own: the word and the link read as one item, which is what
	   keeps Joined's comma between shapes rather than between a word and a
	   name. */
	.rejection {
		white-space: nowrap;
	}
</style>
