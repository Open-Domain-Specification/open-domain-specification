<script lang="ts">
import type { Snippet } from "svelte";

/**
 * An identifier as the editor sets it: an attribute name, a type, the name of
 * an identity field. `Keyword mono` covers a code that classifies, which is
 * secondary text; this is the other half, a name the reader is meant to read
 * as the code says it, so it keeps the foreground colour. The declarations are
 * resets as much as style: the v1 page stylesheet draws bare `code` at 0.9em
 * with the id chip's border, and stays loaded while the templates move over.
 */
const { text, children }: { text?: string; children?: Snippet } = $props();
</script>

<code class="code">{#if children}{@render children()}{:else}{text}{/if}</code>

<style>
	.code {
		font-family: var(--vscode-editor-font-family);
		font-size: 0.92em;
		color: inherit;
		background: none;
		border: 0;
		padding: 0;
	}
</style>
