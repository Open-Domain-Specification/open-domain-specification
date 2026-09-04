<script lang="ts">
import type { Snippet } from "svelte";
import Toc from "./organisms/Toc.svelte";

/**
 * The two-column page: content on the left with a 1200px cap and the page
 * gutter, the table of contents sticky on the right, collapsing under 900px.
 * The shape is v1's and is kept; what changes is that the layout carries its
 * own tokens rather than leaning on the v1 page stylesheet, so a v2 page
 * renders the same in the editor, on the site and in Storybook.
 */
const {
	sections,
	children,
}: { sections: { id: string; label: string }[]; children: Snippet } = $props();
</script>

<div class="layout-v2">
	<main>{@render children()}</main>
	<Toc {sections} />
</div>

<style>
	.layout-v2 {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 200px;
		gap: 32px;
		max-width: 1200px;
		margin: 0 auto;
		padding: 16px 24px 64px;
		background: var(--vscode-editor-background);
		color: var(--vscode-foreground);
		font-family: var(--vscode-font-family);
		font-size: var(--vscode-font-size);
	}
	main {
		min-width: 0;
	}
	/* Unchanged from v1: under 900px the page is one column and the TOC goes. */
	@media (max-width: 900px) {
		.layout-v2 {
			grid-template-columns: minmax(0, 1fr);
		}
		.layout-v2 :global(.toc-v2) {
			display: none;
		}
	}
</style>
