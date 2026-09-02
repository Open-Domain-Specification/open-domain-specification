<script lang="ts">
import { Position, SvelteFlowProvider } from "@xyflow/svelte";
import FloatingEdge from "./FloatingEdge.svelte";

let {
	label = "uses",
	markerEnd = undefined,
	style = undefined,
}: {
	label?: string;
	markerEnd?: string;
	style?: string;
} = $props();
</script>

<SvelteFlowProvider>
	<svg role="img" aria-label="edge">
		<FloatingEdge id="e" source="#/a" target="#/b" type="floating" {label} {markerEnd} {style} sourceX={0} sourceY={0} targetX={0} targetY={0} sourcePosition={Position.Right} targetPosition={Position.Left} />
	</svg>
</SvelteFlowProvider>
