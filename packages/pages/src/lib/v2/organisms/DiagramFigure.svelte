<script lang="ts">
import type { Graph } from "../../flow/graph";
import InteractiveDiagram from "../../organisms/InteractiveDiagram.svelte";
import EmptyState from "../EmptyState.svelte";

/**
 * A captioned diagram. The rounded `editorWidget` frame of v1 goes: the
 * figure is the canvas between two hairlines at the page's full width, with
 * the caption below in the secondary colour at row height, which is how the
 * editor shows an embedded image preview — content, a rule, a caption.
 */
const {
	caption,
	emptyText,
	graph,
	direction = "LR",
}: {
	caption: string;
	emptyText: string;
	graph: Graph;
	direction?: "LR" | "TB";
} = $props();
</script>

{#if graph.nodes.length === 0}
	<EmptyState text={emptyText} />
{:else}
	<figure class="figure">
		<div class="canvas"><InteractiveDiagram {graph} {direction} /></div>
		<figcaption>{caption}</figcaption>
	</figure>
{/if}

<style>
	/* The v1 page stylesheet gives `figure.diagram` a rounded widget frame. */
	.figure {
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: none;
	}
	.canvas {
		height: 60vh;
		min-height: 320px;
		border-top: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
		border-bottom: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
	}
	figcaption {
		padding: 0 8px;
		line-height: 22px;
		text-align: left;
		color: var(--vscode-descriptionForeground);
	}
</style>
