<script lang="ts">
import Empty from "../atoms/Empty.svelte";
import type { Graph } from "../flow/graph";
import InteractiveDiagram from "./InteractiveDiagram.svelte";

/** A captioned interactive figure; empty when the graph has no nodes. */
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
	<Empty text={emptyText} />
{:else}
	<figure class="diagram">
		<div class="canvas"><InteractiveDiagram {graph} {direction} /></div>
		<figcaption>{caption}</figcaption>
	</figure>
{/if}
