<script lang="ts">
import type { Consumable } from "@open-domain-specification/core";
import { ICONS } from "../../model";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Keyword from "../Keyword.svelte";
import Lockup from "../Lockup.svelte";
import Ref from "../Ref.svelte";
import Joined from "./Joined.svelte";

/**
 * What a context or a service publishes: the densest surface on any page, and
 * the reference the `DataTable` density story is drawn from. v1 packed the
 * kind, the visibility and the pattern into three identical chips in one
 * cell; here each is its own column, so the eye reads down a column instead of
 * across a row of pills, and the pattern is in the editor font because it is a
 * code from a table.
 */
const { consumables }: { consumables: Iterable<Consumable> } = $props();

const rows = $derived([...consumables]);
const columns: Column[] = [
	{ key: "name", label: "Consumable", sortable: true },
	{ key: "type", label: "Kind", sortable: true },
	{ key: "visibility", label: "Visibility" },
	{ key: "pattern", label: "Pattern" },
	{ key: "schema", label: "Schema" },
	{ key: "raises", label: "Raises" },
	{ key: "consumers", label: "Consumed by" },
];
</script>

<DataTable
	{columns}
	{rows}
	rowId={(c) => c.ref}
	sortValue={(c, key) => (key === "type" ? c.type : c.name)}
	empty="Provides nothing."
>
	{#snippet cell(c, col)}
		{#if col.key === "name"}
			<Lockup kind={c.type === "event" ? "event" : "command"} name={c.name} ref={c.ref} />
		{:else if col.key === "type"}
			<Keyword text={c.type} />
		{:else if col.key === "visibility"}
			{#if c.internal}
				<Keyword text="internal" title="Stays inside its context; other contexts cannot consume it." />
			{/if}
		{:else if col.key === "pattern"}
			{#if c.pattern}<Keyword text={c.pattern} mono />{/if}
		{:else if col.key === "schema"}
			{#if c.schema}
				<Ref ref={c.schema.ref} label={c.schema.name} icon={ICONS.schema} />
			{:else}
				<Keyword text="none" />
			{/if}
		{:else if col.key === "raises"}
			<Joined>{#each c.raisedEvents as e (e.ref)}<Ref ref={e.ref} label={e.name} icon={ICONS.event} kind="event" />{:else}<Keyword text="–" />{/each}</Joined>
		{:else if c.internal}
			<Keyword text="internal" />
		{:else}
			<Joined>{#each c.consumptions as x (x.consumer.ref)}<Ref ref={x.consumer.ref} label={x.consumer.name} />{:else}<Keyword text="none" />{/each}</Joined>
		{/if}
	{/snippet}
</DataTable>
