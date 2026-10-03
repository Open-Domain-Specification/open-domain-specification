<script lang="ts">
import { renderMarkdown } from "./markdown";

/**
 * Markdown to HTML. Raw HTML in the source is shown as text, so descriptions
 * cannot inject markup, and only http, https, mailto and in-model refs render
 * as links, so they cannot carry script either.
 */
const { text }: { text: string | undefined } = $props();
const html = $derived(text ? renderMarkdown(text) : "");
</script>

{#if html}<div class="md">{@html html}</div>{/if}

<style>
	/* A link inside running text is marked by the renderer (`prose`, see markdown.ts) and
	   colour is not its only cue (#79). A link that is the whole of its paragraph, list item
	   or table cell, or sits only among delimiters, is standalone and is not marked. */
	.md :global(a.prose) {
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 2px;
	}
</style>
