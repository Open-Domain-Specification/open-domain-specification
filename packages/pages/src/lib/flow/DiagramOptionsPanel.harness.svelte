<script lang="ts">
import { SvelteFlow } from "@xyflow/svelte";
import DiagramOptionsPanel from "./DiagramOptionsPanel.svelte";
import type { DiagramKind } from "./kind";

let { kind = "context" }: { kind?: DiagramKind } = $props();
</script>

<div style="width: 400px; height: 300px">
	<SvelteFlow nodes={[]} edges={[]}><DiagramOptionsPanel {kind} /></SvelteFlow>
</div>
