<script lang="ts">
import { SvelteFlow } from "@xyflow/svelte";
import { untrack } from "svelte";
import DiagramOptionsPanel from "./DiagramOptionsPanel.svelte";
import { createFullscreen, type Fullscreen } from "./fullscreen.svelte";
import type { DiagramKind } from "./kind";
import { createPanelState } from "./panel-state.svelte";

/** `crowded` stands in for the fit having run out of room and closed the panel. */
let {
	kind = "context",
	fullscreen = createFullscreen(),
	crowded = false,
}: {
	kind?: DiagramKind;
	fullscreen?: Fullscreen;
	crowded?: boolean;
} = $props();
const panel = createPanelState("options");
if (untrack(() => crowded)) panel.crowd();
</script>

<div style="width: 400px; height: 300px">
	<SvelteFlow nodes={[]} edges={[]}><DiagramOptionsPanel {kind} {fullscreen} {panel} /></SvelteFlow>
</div>
