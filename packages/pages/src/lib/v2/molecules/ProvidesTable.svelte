<script lang="ts">
import type { Consumable } from "@open-domain-specification/core";
import { ICONS } from "../../model";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Keyword from "../Keyword.svelte";
import Lockup from "../Lockup.svelte";
import Ref from "../Ref.svelte";
import ConsumableKeywords from "./ConsumableKeywords.svelte";
import { kindOf } from "./element-kind";
import RefList from "./RefList.svelte";

/** What an aggregate or a service opens to the rest of the model, one row each. */
const { consumables }: { consumables: Iterable<Consumable> } = $props();

const rows = $derived([...consumables]);
const columns: Column[] = [
	{ key: "name", label: "Consumable", sortable: true },
	{ key: "kind", label: "Kind", sortable: true },
	{ key: "schema", label: "Schema" },
	{ key: "raises", label: "Raises" },
	{ key: "consumers", label: "Consumed by" },
];
const sortValue = (c: Consumable, key: string) =>
	key === "kind" ? c.type : c.name;
</script>

<DataTable {columns} {rows} {sortValue} empty="Provides nothing." rowId={(c) => c.ref}>
	{#snippet cell(c, col)}
		{#if col.key === "name"}
			<Lockup kind={kindOf(c)} name={c.name} ref={c.ref} />
		{:else if col.key === "kind"}
			<ConsumableKeywords consumable={c} />
		{:else if col.key === "schema"}
			{#if c.schema}<Ref ref={c.schema.ref} label={c.schema.name} icon={ICONS.schema} />{:else}<Keyword text="none" />{/if}
		{:else if col.key === "raises"}
			<RefList items={c.raisedEvents} kind="event" empty="nothing" />
		{:else if c.internal}
			<Keyword text="internal" />
		{:else}
			<RefList items={c.consumptions.map((x) => x.consumer)} empty="nobody yet" />
		{/if}
	{/snippet}
</DataTable>
