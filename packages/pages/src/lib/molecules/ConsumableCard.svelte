<script lang="ts">
import type { Consumable } from "@open-domain-specification/core";
import Dim from "../atoms/Dim.svelte";
import Icon from "../atoms/Icon.svelte";
import RefLink from "../atoms/RefLink.svelte";
import { consumableIcon, ICONS } from "../model";
import AttributeTable from "./AttributeTable.svelte";
import Card from "./Card.svelte";
import ConsumableChips from "./ConsumableChips.svelte";
import RefList from "./RefList.svelte";

/** A consumable as a card: chips, schema attributes, what it raises or is raised by, who consumes it. */
let {
	consumable: c,
	raisedBy = [],
}: { consumable: Consumable; raisedBy?: Consumable[] } = $props();
const hasLines = $derived(
	c.raisedEvents.length > 0 || raisedBy.length > 0 || !c.internal,
);
</script>

<Card ref={c.ref} name={c.name} icon={consumableIcon(c)} description={c.description}>
	{#snippet meta()}<ConsumableChips consumable={c} />{/snippet}
	{#if c.schema}
		<p class="dim"><Icon name={ICONS.schema} /> <RefLink ref={c.schema.ref} label={c.schema.name} /></p>
		<AttributeTable attributes={c.schema.attributes.values()} />
	{/if}
	{#if hasLines}
		<p class="policy">
			{#if c.raisedEvents.length}<Dim>raises</Dim> <RefList items={c.raisedEvents} icon={ICONS.event} /><br />{/if}
			{#if raisedBy.length}<Dim>raised by</Dim> <RefList items={raisedBy} icon={ICONS.command} /><br />{/if}
			{#if !c.internal}<Dim>consumed by</Dim> <RefList items={c.consumptions.map((x) => x.consumer)} empty="nobody yet" />{/if}
		</p>
	{/if}
</Card>
