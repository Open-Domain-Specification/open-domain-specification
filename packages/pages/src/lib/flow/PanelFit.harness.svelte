<script lang="ts">
import { SvelteFlow } from "@xyflow/svelte";
import { createDiagramFit, type DiagramFit } from "./fit.svelte";
import PanelFit from "./PanelFit.svelte";

let {
	container,
	fit = createDiagramFit(),
}: { container?: HTMLElement; fit?: DiagramFit } = $props();
</script>

<div style="width: 400px; height: 300px">
	<SvelteFlow nodes={[]} edges={[]}><PanelFit {container} {fit} /></SvelteFlow>
</div>
