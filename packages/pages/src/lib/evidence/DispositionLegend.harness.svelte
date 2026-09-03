<script lang="ts">
import { SvelteFlow } from "@xyflow/svelte";
import type { Graph } from "../flow/graph";
import type { DiagramKind } from "../flow/kind";
import DispositionLegend from "./DispositionLegend.svelte";
import type { Disposition } from "./fixtures";

/** The legend only renders inside a flow. */
let {
	graph,
	kind,
	dispositions,
}: { graph: Graph; kind: DiagramKind; dispositions: Disposition[] } = $props();
</script>

<div style="width: 400px; height: 300px">
	<SvelteFlow nodes={[]} edges={[]}>
		<DispositionLegend {graph} {kind} {dispositions} />
	</SvelteFlow>
</div>
