<script lang="ts">
import type { NodeProps } from "@xyflow/svelte";
import Icon from "../atoms/Icon.svelte";
import { type ConsumableNodeData, slotIcon } from "./consumable-graph";
import NodeHandles from "./NodeHandles.svelte";
import { roleLabel } from "./roles";

/**
 * An aggregate or service on the consumable map as a UML «component»: the
 * stereotype line with the component icon at the top right, the name and
 * the cluster path. Each consumable it provides is a lollipop on its left
 * edge, the ball being the target handle edges land on, labelled with the
 * pattern it is offered under; each consumable it requires is a socket on
 * its right edge, the source handle an assembly connector leaves from,
 * labelled with the consumer's pattern. `floating` hides the plain handles;
 * lollipops and sockets stay, as the connectors still meet them.
 */
let {
	data,
}: NodeProps & { data: ConsumableNodeData & { floating?: boolean } } = $props();
</script>

<div class="flow-card consumable-node component" title={data.description ?? data.id}>
	<div class="stereotype-line">
		<span class="stereotype">«component»</span>
		<svg class="component-icon" viewBox="0 0 16 14" width="16" height="14" aria-hidden="true">
			<rect x="4" y="1" width="11" height="12" />
			<rect x="1" y="3.5" width="6" height="2.5" />
			<rect x="1" y="8" width="6" height="2.5" />
		</svg>
	</div>
	<div class="head"><Icon name={data.icon} /> <strong>{data.label}</strong></div>
	{#if data.groupPath}<div class="group">{data.groupPath}</div>{/if}
	{#if data.slots.length || data.requires.length}
		<ul class="slots">
			{#each data.slots as slot (slot.id)}
				<li class="slot provided" title={slot.description ?? slot.id} data-slot={slot.id}>
					<NodeHandles floating={data.floating} source={false} target={{ id: slot.id, label: roleLabel(slot.pattern), title: slot.pattern ?? slot.name, shape: "lollipop" }} />
					<Icon name={slotIcon(slot.kind)} /> <span class="name">{slot.name}</span>
				</li>
			{/each}
			{#each data.requires as req (req.id)}
				<li class="slot required" title={req.id} data-slot={req.id}>
					<span class="name">{req.name}</span>
					<NodeHandles floating={data.floating} target={false} source={{ id: req.id, label: roleLabel(req.pattern), title: req.pattern ?? req.name, shape: "socket" }} />
				</li>
			{/each}
		</ul>
	{/if}
	<NodeHandles floating={data.floating} target={!data.slots.length && {}} source={!data.requires.length && {}} />
</div>

<style>
	.component { border-color: var(--fg); border-radius: 2px; padding: 6px 12px 8px; }
	.stereotype-line { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 10px; color: var(--muted); }
	.component-icon { fill: var(--card); stroke: var(--fg); stroke-width: 1; flex: none; }
	.component .head { justify-content: center; }
	.component .group { text-align: center; }
	.slots { list-style: none; margin: 6px -12px 0; padding: 4px 0 0; border-top: 1px solid var(--fg); }
	.slot { position: relative; display: flex; gap: 6px; align-items: center; padding: 5px 12px; font-size: 11px; white-space: nowrap; }
	.slot.provided { padding-left: 18px; }
	.slot.required { justify-content: flex-end; padding-right: 18px; }
</style>
