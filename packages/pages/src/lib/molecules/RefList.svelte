<script lang="ts">
import Dim from "../atoms/Dim.svelte";
import RefLink from "../atoms/RefLink.svelte";

/** Comma-separated links, or a dim placeholder when there are none. */
let {
	items,
	icon,
	empty = "none",
}: {
	items: { ref: string; name: string }[];
	icon?: string;
	empty?: string;
} = $props();
</script>

{#each items as i, n}{#if n}, {/if}<RefLink ref={i.ref} label={i.name} {icon} />{:else}<Dim>{empty}</Dim>{/each}
