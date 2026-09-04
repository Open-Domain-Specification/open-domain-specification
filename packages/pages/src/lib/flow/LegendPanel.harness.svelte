<script lang="ts">
import { SvelteFlow, SvelteFlowProvider } from "@xyflow/svelte";
import type { Graph } from "./graph";
import type { DiagramKind } from "./kind";
import LegendPanel from "./LegendPanel.svelte";

/** The legend only renders inside a flow, and the flow itself needs a provider for its context. */
let { graph, kind }: { graph: Graph; kind: DiagramKind } = $props();
</script>

<div style="width: 400px; height: 300px">
	<SvelteFlowProvider>
		<SvelteFlow nodes={[]} edges={[]}>
			<!-- `graph` arrives undefined for one tick while Storybook resolves args. -->
			{#if graph}<LegendPanel {graph} {kind} />{/if}
		</SvelteFlow>
	</SvelteFlowProvider>
</div>
