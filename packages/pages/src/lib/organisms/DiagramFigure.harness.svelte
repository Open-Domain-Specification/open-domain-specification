<script lang="ts">
import type { Graph } from "../flow/graph";
import ModelProvider from "../ModelProvider.svelte";
import type { Model } from "../model";
import DiagramFigure from "./DiagramFigure.svelte";

let {
	model,
	caption,
	emptyText,
	graph,
}: {
	model: Model;
	caption: string;
	emptyText: string;
	graph: Graph;
} = $props();
</script>

<ModelProvider {model}>
	<DiagramFigure {caption} {emptyText} {graph} />
</ModelProvider>
