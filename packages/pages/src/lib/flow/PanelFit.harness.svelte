<script lang="ts">
import { SvelteFlow } from "@xyflow/svelte";
import PanelFit from "./PanelFit.svelte";

let { container }: { container?: HTMLElement } = $props();
</script>

<div style="width: 400px; height: 300px">
	<SvelteFlow nodes={[]} edges={[]}><PanelFit {container} /></SvelteFlow>
</div>
