<script lang="ts">
import { SvelteFlow } from "@xyflow/svelte";
import DiagramOptionsPanel from "./DiagramOptionsPanel.svelte";
</script>

<div style="width: 400px; height: 300px">
	<SvelteFlow nodes={[]} edges={[]}><DiagramOptionsPanel /></SvelteFlow>
</div>
