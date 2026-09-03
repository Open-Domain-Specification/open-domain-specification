<script lang="ts">
import { SvelteFlow } from "@xyflow/svelte";
import DiagramOptionsPanel from "./DiagramOptionsPanel.svelte";
import { createFullscreen, type Fullscreen } from "./fullscreen.svelte";
import type { DiagramKind } from "./kind";

let {
	kind = "context",
	fullscreen = createFullscreen(),
}: { kind?: DiagramKind; fullscreen?: Fullscreen } = $props();
</script>

<div style="width: 400px; height: 300px">
	<SvelteFlow nodes={[]} edges={[]}><DiagramOptionsPanel {kind} {fullscreen} /></SvelteFlow>
</div>
