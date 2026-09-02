<script lang="ts">
import type { NodeProps } from "@xyflow/svelte";
import Icon from "../atoms/Icon.svelte";
import { type ConsumableNodeData, slotIcon } from "./consumable-graph";
import NodeHandles from "./NodeHandles.svelte";
import NodeHead from "./NodeHead.svelte";
import { roleLabel } from "./roles";

/**
 * An aggregate or service on the consumable map. The head names it and its
 * cluster path; below, each consumable it offers is a slot with its own
 * target handle so a consumption attaches to the exact consumable it uses.
 * A slot shows the event/operation icon, and its handle is a port carrying
 * the pattern it is offered under. `floating` hides the plain handles; the
 * consumable edge finds the slot port itself. `sketch` draws an ellipse.
 */
let {
	data,
}: NodeProps & {
	data: ConsumableNodeData & { floating?: boolean; sketch?: boolean };
} = $props();
</script>

<div class={`flow-card consumable-node ${data.sketch ? "sketch" : ""}`} title={data.description ?? data.id}>
	<NodeHead icon={data.icon} name={data.label} subtitle={data.groupPath} />
	{#if data.slots.length}
		<ul class="slots">
			{#each data.slots as slot (slot.id)}
				<li class="slot" title={slot.description ?? slot.id} data-slot={slot.id}>
					<NodeHandles floating={data.floating} source={false} target={{ id: slot.id, label: roleLabel(slot.pattern), title: slot.pattern }} />
					<Icon name={slotIcon(slot.kind)} /> <span class="name">{slot.name}</span>
				</li>
			{/each}
		</ul>
	{/if}
	<NodeHandles floating={data.floating} target={false} />
</div>

<style>
	.slots { list-style: none; margin: 6px -12px 0; padding: 4px 0 0; border-top: 1px solid var(--border); }
	.slot { position: relative; display: flex; gap: 6px; align-items: center; padding: 4px 12px 4px 18px; font-size: 11px; white-space: nowrap; }
</style>
