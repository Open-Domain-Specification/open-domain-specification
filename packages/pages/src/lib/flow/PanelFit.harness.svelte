<script lang="ts">
import { SvelteFlow, type SvelteFlowStore } from "@xyflow/svelte";
import { createDiagramFit, type DiagramFit } from "./fit.svelte";
import PanelFit from "./PanelFit.svelte";
import StoreProbe from "./StoreProbe.harness.svelte";

let {
	container,
	fit = createDiagramFit(),
	fullscreen = false,
	onstore = () => {},
}: {
	container?: HTMLElement;
	fit?: DiagramFit;
	fullscreen?: boolean;
	onstore?: (store: SvelteFlowStore) => void;
} = $props();
</script>

<div style="width: 400px; height: 300px">
	<SvelteFlow nodes={[]} edges={[]}>
		<StoreProbe {onstore} />
		<PanelFit {container} {fit} {fullscreen} />
	</SvelteFlow>
</div>
