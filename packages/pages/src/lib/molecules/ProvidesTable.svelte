<script lang="ts">
import type { Consumable } from "@open-domain-specification/core";
import Dim from "../atoms/Dim.svelte";
import Empty from "../atoms/Empty.svelte";
import RefLink from "../atoms/RefLink.svelte";
import { consumableIcon, ICONS } from "../model";
import ConsumableChips from "./ConsumableChips.svelte";
import RefList from "./RefList.svelte";

let { consumables }: { consumables: Iterable<Consumable> } = $props();
const rows = $derived([...consumables]);
</script>

{#if rows.length}
	<table>
		<thead><tr><th>Consumable</th><th>Kind</th><th>Schema</th><th>Raises</th><th>Consumed by</th></tr></thead>
		<tbody>
			{#each rows as c}
				<tr id={c.ref}>
					<td><RefLink ref={c.ref} label={c.name} icon={consumableIcon(c)} /></td>
					<td><ConsumableChips consumable={c} /></td>
					<td>{#if c.schema}<RefLink ref={c.schema.ref} label={c.schema.name} icon={ICONS.schema} />{:else}<Dim>none</Dim>{/if}</td>
					<td><RefList items={c.raisedEvents} icon={ICONS.event} empty="–" /></td>
					<td>{#if c.internal}<Dim>internal</Dim>{:else}<RefList items={c.consumptions.map((x) => x.consumer)} />{/if}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<Empty text="Provides nothing." />
{/if}
