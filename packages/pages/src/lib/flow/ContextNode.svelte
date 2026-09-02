<script lang="ts">
import type { NodeProps } from "@xyflow/svelte";
import { type ContextNodeData, clusterHue } from "./context-graph";
import NodeHandles from "./NodeHandles.svelte";
import NodeHead from "./NodeHead.svelte";

/**
 * A bounded context on the context map: name, team in brackets and the
 * domain/subdomain cluster path, with a colour band per cluster standing in
 * for the Graphviz namespace cluster. A big ball of mud is an octagon with a
 * dashed, muddy border. `floating` hides the fixed handles; `sketch` draws
 * the card as an ellipse.
 */
let {
	data,
}: NodeProps & {
	data: ContextNodeData & { floating?: boolean; sketch?: boolean };
} = $props();
const band = $derived(
	data.cluster ? `--band: hsl(${clusterHue(data.cluster)} 60% 55%)` : "",
);
</script>

<div class={`flow-card context-node ${data.bigBallOfMud ? "mud" : ""} ${data.sketch ? "sketch" : ""}`} style={band} title={data.description ?? data.id} data-cluster={data.cluster}>
	<NodeHandles floating={data.floating} />
	<NodeHead icon={data.icon} name={data.label} subtitle={data.groupPath} />
	{#if data.bigBallOfMud}<div class="mud-label">(big ball of mud)</div>{/if}
	{#if data.team}<div class="team">{`[${data.team}]`}</div>{/if}
</div>

<style>
	.context-node {
		--band: var(--border);
		border-top: 4px solid var(--band);
		border-radius: 18px;
		padding: 8px 16px;
		text-align: center;
	}
	.context-node :global(.head) { justify-content: center; }
	.context-node.mud {
		border-style: dashed;
		border-top-style: dashed;
		border-color: #8d6e63;
		border-radius: 0;
		background: color-mix(in srgb, #d7ccc8 40%, var(--card));
		clip-path: polygon(20% 0, 80% 0, 100% 30%, 100% 70%, 80% 100%, 20% 100%, 0 70%, 0 30%);
		padding: 10px 28px;
	}
	.context-node.mud.sketch { clip-path: none; border-radius: 50%; }
	.team, .mud-label { color: var(--muted); font-size: 11px; white-space: nowrap; }
</style>
