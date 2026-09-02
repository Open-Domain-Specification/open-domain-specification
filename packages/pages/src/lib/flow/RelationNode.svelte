<script lang="ts">
import type { NodeProps } from "@xyflow/svelte";
import type { GraphNode } from "./graph";
import NodeHandles from "./NodeHandles.svelte";

/**
 * A UML class box for the relation map: a stereotype line and the name in the
 * header, then an attribute compartment with {id} identity markers and types,
 * and the cluster path (the aggregate's context path) below. Mirrors the
 * Graphviz image; `floating` hides the fixed handles.
 */
let { data }: NodeProps & { data: GraphNode & { floating?: boolean } } =
	$props();
const tone = $derived(data.tone ?? "");
// Guillemets are part of the text: mixed text and expression would compile to a nullish branch v8 never sees.
const stereotype = $derived(`«${data.chips?.[0] ?? "entity"}»`);
</script>

<div class={`flow-card relation-node ${tone}`} title={data.id}>
	<NodeHandles floating={data.floating} />
	<div class="head">
		<span class="stereotype">{stereotype}</span>
		<strong>{data.label}</strong>
	</div>
	<ul class="attrs">
		{#if data.attributes?.length}
			{#each data.attributes as a}
				<li>{#if a.identity}<span class="identity">{"{id} "}</span>{/if}<span class="name">{a.name}</span>: <span class="type">{a.type}</span></li>
			{/each}
		{:else}
			<li class="empty">&nbsp;</li>
		{/if}
	</ul>
	{#if data.groupPath}<div class="group">{data.groupPath}</div>{/if}
</div>

<style>
	.relation-node {
		border-color: var(--fg);
		border-radius: 2px;
		padding: 0;
		min-width: 140px;
	}
	.relation-node.core { border-width: 2px; border-color: var(--core); }
	.relation-node.core .head { background: color-mix(in srgb, var(--core) 12%, var(--card)); }
	.relation-node.muted { border-style: dashed; color: var(--muted); }
	.head { display: flex; flex-direction: column; align-items: center; padding: 6px 12px; white-space: nowrap; }
	.stereotype { font-size: 10px; color: var(--muted); }
	.attrs { list-style: none; margin: 0; padding: 6px 12px; border-top: 1px solid var(--fg); font-family: var(--mono); font-size: 11px; white-space: nowrap; text-align: left; }
	.relation-node.muted .attrs { border-top-style: dashed; }
	.identity { font-weight: 600; }
	.type { color: var(--muted); }
	.relation-node .group { font-size: 10px; padding: 2px 12px 4px; border-top: 1px dotted var(--border); text-align: center; }
</style>
