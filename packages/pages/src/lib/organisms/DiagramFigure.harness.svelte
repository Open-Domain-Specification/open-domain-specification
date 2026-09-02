<script lang="ts">
import type { Graph } from "../flow/graph";
import ModelProvider from "../ModelProvider.svelte";
import type { Model } from "../model";
import DiagramFigure from "./DiagramFigure.svelte";

let {
	model,
	caption,
	dot,
	nodeCount,
	emptyText,
	graph,
}: {
	model: Model;
	caption: string;
	dot: string;
	nodeCount: number;
	emptyText: string;
	graph?: Graph;
} = $props();
</script>

<ModelProvider {model}>
	<DiagramFigure {caption} {dot} {nodeCount} {emptyText} {graph} />
</ModelProvider>
