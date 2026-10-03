<script lang="ts">
import { Controls, SvelteFlow } from "@xyflow/svelte";
import FitViewButton from "./FitViewButton.svelte";
import { createDiagramFit, type DiagramFit } from "./fit.svelte";

let {
	container,
	fit = createDiagramFit(),
}: { container?: HTMLElement; fit?: DiagramFit } = $props();
</script>

<div style="width: 400px; height: 300px">
	<SvelteFlow nodes={[]} edges={[]}>
		<Controls showLock={false} showFitView={false}><FitViewButton {container} {fit} /></Controls>
	</SvelteFlow>
</div>
