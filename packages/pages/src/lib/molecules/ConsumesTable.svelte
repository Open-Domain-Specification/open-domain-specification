<script lang="ts">
import type { Consumption } from "@open-domain-specification/core";
import Chip from "../atoms/Chip.svelte";
import Dim from "../atoms/Dim.svelte";
import Empty from "../atoms/Empty.svelte";
import RefLink from "../atoms/RefLink.svelte";
import { ICONS } from "../model";

let { consumptions }: { consumptions: Consumption[] } = $props();
</script>

{#if consumptions.length}
	<table>
		<thead><tr><th>Consumable</th><th>Provider</th><th>Context</th><th>Protection</th></tr></thead>
		<tbody>
			{#each consumptions as x}
				<tr>
					<td><RefLink ref={x.consumable.ref} label={x.consumable.name} icon={ICONS.consumption} /></td>
					<td><RefLink ref={x.consumable.provider.ref} label={x.consumable.provider.name} /></td>
					<td><RefLink ref={x.consumable.provider.boundedcontext.ref} label={x.consumable.provider.boundedcontext.name} icon={ICONS.boundedcontext} /></td>
					<td>{#if x.pattern}<Chip label={x.pattern} tone="muted" />{:else}<Dim>unspecified</Dim>{/if}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<Empty text="Depends on nothing outside itself." />
{/if}
