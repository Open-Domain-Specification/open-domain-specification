<script lang="ts">
import type { Snippet } from "svelte";

/**
 * Facts about one thing, term beside value, the way the Extensions editor
 * lists Identifier, Version and Published. Terms sit in one aligned column in
 * the secondary colour, values in the foreground; rows are the platform's
 * 22px so a list of facts reads at the same rhythm as a tree. It replaces
 * v1's card that held a single fact and its wrapped fact strip in the header.
 * Rows are `<Definition>`s.
 */
const { children }: { children: Snippet } = $props();
</script>

<dl class="definitions">{@render children()}</dl>

<style>
	.definitions {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		column-gap: 16px;
		row-gap: 0;
		margin: 0;
		line-height: 22px;
	}
</style>
