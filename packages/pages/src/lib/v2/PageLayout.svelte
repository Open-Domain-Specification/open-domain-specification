<script lang="ts">
import type { Snippet } from "svelte";

/**
 * The page's chrome: an optional sticky toolbar over two columns, the content
 * in the first and the table of contents in the second, capped at 1200px and
 * gutted at 16px/24px. None of that changes in v2 — it is already the shape
 * a VS Code editor tab wants — so this is the v1 layout with the primitives'
 * tokens and with the anchor flash moved off the card background it no longer
 * has: a scrolled-to row washes in `list.hoverBackground` for 1.6s, which is
 * how the workbench marks a row it has just revealed.
 *
 * The toolbar's buttons and the routing stay with the host; this is the frame.
 */
const {
	toolbar,
	toc,
	children,
}: { toolbar?: Snippet; toc?: Snippet; children: Snippet } = $props();
</script>

{#if toolbar}<div class="toolbar">{@render toolbar()}</div>{/if}
<div class="layout" class:with-toc={!!toc}>
	<main>{@render children()}</main>
	{#if toc}{@render toc()}{/if}
</div>

<style>
	.toolbar {
		position: sticky;
		top: 0;
		z-index: 2;
		display: flex;
		gap: 4px;
		align-items: center;
		min-height: 32px;
		padding: 4px 8px;
		background: var(--vscode-editor-background);
		border-bottom: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 32px;
		max-width: 1200px;
		margin: 0 auto;
		padding: 16px 24px 64px;
	}
	.with-toc {
		grid-template-columns: minmax(0, 1fr) 200px;
	}
	main {
		min-width: 0;
	}
	/* Under 900px the table of contents goes and the content takes the width. */
	@media (max-width: 900px) {
		.with-toc {
			grid-template-columns: minmax(0, 1fr);
		}
		.with-toc > :global(:not(main)) {
			display: none;
		}
	}
	/* `.flash` is the host's marker class, kept from v1, put on whatever the
	   page just scrolled to; only what it washes changes. */
	.layout :global(.flash) {
		animation: flash 1.6s ease-out;
	}
	@keyframes flash {
		from {
			background: var(--vscode-list-hoverBackground);
		}
		to {
			background: transparent;
		}
	}
</style>
