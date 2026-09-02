<script lang="ts">
import { Handle, type NodeProps, Position } from "@xyflow/svelte";
import Icon from "../atoms/Icon.svelte";
import type { GraphNode } from "./graph";

/** A graph node styled like the page cards, with an optional attribute compartment. */
let { data }: NodeProps & { data: GraphNode } = $props();
const tone = $derived(data.tone ?? "");
</script>

<div class={`ods-node ${tone}`} title={data.id}>
	<Handle type="target" position={Position.Left} />
	<div class="head"><Icon name={data.icon} /> <strong>{data.label}</strong></div>
	{#if data.group}<div class="group">{data.group}</div>{/if}
	{#if data.chips?.length}
		<div class="chips">{#each data.chips as c}<span class="chip muted">{c}</span>{/each}</div>
	{/if}
	{#if data.attributes?.length}
		<ul class="attrs">
			{#each data.attributes as a}
				<li>{#if a.identity}<Icon name="key" /> {/if}<span class="name">{a.name}</span>: <span class="type">{a.type}</span></li>
			{/each}
		</ul>
	{/if}
	<Handle type="source" position={Position.Right} />
</div>

<style>
	.ods-node {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 8px 12px;
		font-size: 12px;
		color: var(--fg);
		min-width: 120px;
		cursor: pointer;
	}
	.ods-node.core { border-color: var(--core); }
	.ods-node.warn { border-color: var(--warn); border-style: dashed; }
	.ods-node.muted { border-style: dashed; }
	.head { display: flex; gap: 6px; align-items: center; white-space: nowrap; }
	.group { color: var(--muted); font-size: 11px; white-space: nowrap; }
	.chips { margin-top: 4px; display: flex; gap: 4px; flex-wrap: wrap; }
	.attrs { list-style: none; margin: 6px 0 0; padding: 6px 0 0; border-top: 1px solid var(--border); font-family: var(--mono); font-size: 11px; white-space: nowrap; }
	.type { color: var(--muted); }
</style>
