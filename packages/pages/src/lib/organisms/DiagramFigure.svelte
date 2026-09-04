<script lang="ts">
import EmptyState from "../atoms/EmptyState.svelte";
import type { Graph } from "../flow/graph";
import InteractiveDiagram from "./InteractiveDiagram.svelte";

/**
 * A diagram on a page: the canvas between two hairlines with its caption
 * below in the secondary colour, which is how the editor shows an embedded
 * image preview — content, a rule, a caption. The rounded `editorWidget`
 * frame v1 drew around it goes. The canvas itself is `InteractiveDiagram`,
 * kept as it is: the diagram language has its own cards.
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
	<figure class="diagram">
		<div class="canvas"><InteractiveDiagram {graph} {direction} /></div>
		<figcaption>{caption}</figcaption>
	</figure>
{/if}

<style>
	.diagram {
		margin: 8px 0;
	}
	/* The canvas sizes itself (`InteractiveDiagram` is 60vh); the figure only
	   rules it off above and below. */
	.canvas {
		overflow: hidden;
		border-top: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
		border-bottom: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
	}
	figcaption {
		padding: 0 8px;
		line-height: 22px;
		color: var(--vscode-descriptionForeground);
	}
</style>
