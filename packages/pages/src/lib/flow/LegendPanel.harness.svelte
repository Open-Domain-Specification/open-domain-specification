<script lang="ts">
import { SvelteFlow } from "@xyflow/svelte";
import type { Graph } from "./graph";
import type { DiagramKind } from "./kind";
import LegendPanel from "./LegendPanel.svelte";

/** The legend only renders inside a flow. */
let { graph, kind }: { graph: Graph; kind: DiagramKind } = $props();
</script>

<div style="width: 400px; height: 300px">
	<SvelteFlow nodes={[]} edges={[]}><LegendPanel {graph} {kind} /></SvelteFlow>
</div>
