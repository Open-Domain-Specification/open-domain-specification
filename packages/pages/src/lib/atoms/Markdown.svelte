<script lang="ts">
import { marked } from "marked";

/** Markdown to HTML. Raw HTML in the source is shown as text, so descriptions cannot inject markup. */
const { text }: { text: string | undefined } = $props();
const html = $derived(
	text
		? (marked.parse(text.replace(/</g, "&lt;").replace(/>/g, "&gt;"), {
				async: false,
			}) as string)
		: "",
);
</script>

{#if html}<div class="md">{@html html}</div>{/if}
