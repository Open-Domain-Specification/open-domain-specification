<script lang="ts">
import { type Consumption, PATTERNS } from "@open-domain-specification/core";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Keyword from "../Keyword.svelte";
import Lockup from "../Lockup.svelte";
import ConsumableKeywords from "./ConsumableKeywords.svelte";
import { kindOf } from "./element-kind";

/** What this element depends on from elsewhere, and how each dependency is protected. */
const {
	consumptions,
	empty = "Depends on nothing outside itself.",
}: { consumptions: Consumption[]; empty?: string } = $props();

const columns: Column[] = [
	{ key: "name", label: "Consumable", sortable: true },
	{ key: "kind", label: "Kind" },
	{ key: "provider", label: "Provider" },
	{ key: "context", label: "Context", sortable: true },
	{ key: "protection", label: "Protection" },
];
const sortValue = (x: Consumption, key: string) =>
	key === "context"
		? x.consumable.provider.boundedcontext.name
		: x.consumable.name;
</script>

<DataTable
	{columns}
	rows={consumptions}
	{empty}
	{sortValue}
>
	{#snippet cell(x, col)}
		{#if col.key === "name"}
			<Lockup kind={kindOf(x.consumable)} name={x.consumable.name} ref={x.consumable.ref} />
		{:else if col.key === "kind"}
			<ConsumableKeywords consumable={x.consumable} />
		{:else if col.key === "provider"}
			<Lockup kind={kindOf(x.consumable.provider)} name={x.consumable.provider.name} ref={x.consumable.provider.ref} />
		{:else if col.key === "context"}
			<Lockup kind="boundedcontext" name={x.consumable.provider.boundedcontext.name} ref={x.consumable.provider.boundedcontext.ref} />
		{:else if x.pattern}
			<Keyword text={x.pattern} mono title={PATTERNS[x.pattern].summary} />
		{:else}
			<Keyword text="unspecified" />
		{/if}
	{/snippet}
</DataTable>
