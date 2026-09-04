<script lang="ts">
import type { Snippet } from "svelte";
import Toc from "../organisms/Toc.svelte";

/**
 * The two columns every page is drawn in: the content, capped at 1200px with
 * the page gutter, and the sticky table of contents beside it. Under 900px
 * the contents column goes and the page is one column, as it is in a narrow
 * editor tab. `.layout` belongs to this component alone — the page stylesheet
 * has no rule for it — so a page draws correctly anywhere it is mounted: a
 * webview, the static site or a story.
 */
const {
	sections,
	children,
}: { sections: { id: string; label: string }[]; children: Snippet } = $props();
</script>

<div class="layout">
	<main>{@render children()}</main>
	<Toc {sections} />
</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 200px;
		gap: 32px;
		max-width: 1200px;
		margin: 0 auto;
		padding: 16px 24px 64px;
		background: var(--vscode-editor-background);
		color: var(--vscode-foreground);
	}
	@media (max-width: 900px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.layout :global(.toc) {
			display: none;
		}
	}
</style>
