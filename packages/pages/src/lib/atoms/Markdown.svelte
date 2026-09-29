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
