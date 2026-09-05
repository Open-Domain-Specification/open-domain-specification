<script lang="ts">
import { SvelteFlow, SvelteFlowProvider } from "@xyflow/svelte";
import { untrack } from "svelte";
import type { Graph } from "./graph";
import type { DiagramKind } from "./kind";
import LegendPanel from "./LegendPanel.svelte";
import { createLegendState } from "./legend-state.svelte";

/**
 * The legend only renders inside a flow, and the flow itself needs a provider
 * for its context. `crowded` stands in for the fit having run out of room, so
 * the collapsed state is showable without a map wide enough to cause it.
 */
let {
	graph,
	kind,
	crowded = false,
}: { graph: Graph; kind: DiagramKind; crowded?: boolean } = $props();
const legend = createLegendState();
// Read once, as the fit's verdict is: the story sets it before the panel draws.
if (untrack(() => crowded)) legend.crowd();
</script>

<div style="width: 400px; height: 300px">
	<SvelteFlowProvider>
		<SvelteFlow nodes={[]} edges={[]}>
			<!-- `graph` arrives undefined for one tick while Storybook resolves args. -->
			{#if graph}<LegendPanel {graph} {kind} {legend} />{/if}
		</SvelteFlow>
	</SvelteFlowProvider>
</div>
