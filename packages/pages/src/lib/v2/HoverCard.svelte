<script lang="ts">
import type { Snippet } from "svelte";

/**
 * The frame every hover disclosure uses (RFC-002 section 4): the editor's
 * own hover widget, in its tokens, so a pattern summary over a keyword or an
 * evidence summary over a map badge looks like the hover the reader gets over
 * a symbol in code. The heading is the thing hovered; the body is the caller's,
 * split by `<hr>` where the editor hover would split a signature from its
 * documentation. Positioning is the caller's job; this is the frame.
 */
const { heading, children }: { heading?: string; children: Snippet } = $props();
</script>

<div class="hover-card" role="tooltip">
	{#if heading}<div class="heading">{heading}</div>{/if}
	<div class="body">{@render children()}</div>
</div>

<style>
	.hover-card {
		display: inline-block;
		max-width: 500px;
		padding: 4px 8px;
		border: 1px solid var(--vscode-editorHoverWidget-border, var(--vscode-widget-border));
		border-radius: 3px;
		background: var(--vscode-editorHoverWidget-background, var(--vscode-editorWidget-background));
		color: var(--vscode-editorHoverWidget-foreground, var(--vscode-foreground));
		box-shadow: 0 2px 8px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.16));
		line-height: 1.5;
	}
	.heading {
		font-weight: 600;
	}
	.body :global(hr) {
		margin: 4px -8px;
		border: 0;
		border-top: 1px solid var(--vscode-editorHoverWidget-border, var(--vscode-widget-border));
	}
	.body :global(p) {
		margin: 0;
	}
</style>
