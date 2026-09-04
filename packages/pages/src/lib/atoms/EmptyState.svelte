<script lang="ts">
import type { Snippet } from "svelte";

/**
 * What a section says when it has nothing to list. One plain sentence in
 * the secondary colour, at the row height, with room for one action after
 * it: an empty tree view in VS Code does the same, a sentence and a link,
 * never an illustration. The sentence should say what would fill the space.
 */
const { text, children }: { text: string; children?: Snippet } = $props();
</script>

<p class="empty">{text}{#if children}{" "}{@render children()}{/if}</p>

<style>
	.empty {
		margin: 0;
		padding: 0 8px;
		line-height: 22px;
		font-style: normal;
		color: var(--vscode-descriptionForeground);
	}
</style>
