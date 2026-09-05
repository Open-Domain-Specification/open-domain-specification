<script lang="ts">
import { SvelteFlow } from "@xyflow/svelte";
import { createLegendState, type LegendState } from "./legend-state.svelte";
import PanelFit from "./PanelFit.svelte";

let {
	container,
	legend = createLegendState(),
}: { container?: HTMLElement; legend?: LegendState } = $props();
</script>

<div style="width: 400px; height: 300px">
	<SvelteFlow nodes={[]} edges={[]}><PanelFit {container} {legend} /></SvelteFlow>
</div>
