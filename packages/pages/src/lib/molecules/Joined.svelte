<script lang="ts">
import type { Snippet } from "svelte";

/**
 * A short list of things inside one cell or one fact: refs, lockups or
 * keywords, separated by commas. The separator is drawn by the stylesheet
 * rather than written between the items, so a list is one `{#each}` over the
 * things themselves and every list on every page separates the same way.
 */
const { children }: { children: Snippet } = $props();
</script>

<span class="joined">{@render children()}</span>

<style>
	.joined {
		min-width: 0;
	}
	.joined > :global(*:not(:first-child))::before {
		content: ", ";
		color: var(--vscode-foreground);
	}
</style>
