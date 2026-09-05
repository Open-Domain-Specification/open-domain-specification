<script lang="ts">
import type { Consumption } from "@open-domain-specification/core";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Ref from "../atoms/Ref.svelte";
import { ICONS } from "../model";
import ContextLockup from "./ContextLockup.svelte";

/**
 * What a context or a service depends on, what of it makes the call, and how
 * it protects itself from each. A consumption that names nothing is the whole
 * consumer, which is the common case (decision 21).
 *
 * The same rows read the other way round on a consumable's page, which lists
 * who consumes *it*, so `empty` is the caller's word for a table with nothing
 * in it.
 *
 * A consumption has no page of its own, so each row carries the consumption's
 * ref as its id: a link or a diagnostic at that ref lands on the consumer's
 * page and flashes the row (decision 26). One consumer may take one consumable
 * more than once, an archive beside a translation, and the ref of each such
 * consumption carries the first caller in `by`, so the rows keep one id each
 * (card 89).
 */
const {
	consumptions,
	empty = "Depends on nothing outside itself.",
}: { consumptions: Consumption[]; empty?: string } = $props();

const columns: Column[] = [
	{ key: "consumable", label: "Consumable" },
	{ key: "provider", label: "Provider" },
	{ key: "context", label: "Context" },
	{ key: "madeBy", label: "Made By" },
	{ key: "protection", label: "Protection" },
];
</script>

<DataTable
	{columns}
	rows={consumptions}
	rowId={(x) => x.ref}
	{empty}
>
	{#snippet cell(x, col)}
		{#if col.key === "consumable"}
			<Ref ref={x.consumable.ref} label={x.consumable.name} icon={ICONS.consumption} />
		{:else if col.key === "provider"}
			<Ref ref={x.consumable.provider.ref} label={x.consumable.provider.name} />
		{:else if col.key === "context"}
			<ContextLockup context={x.consumable.provider.boundedcontext} />
		{:else if col.key === "madeBy"}
			{#if x.by.length}
				{#each x.by as made (made.ref)}<Ref ref={made.ref} label={made.name} />{/each}
			{:else}
				<Keyword text="whole consumer" />
			{/if}
		{:else if x.pattern}
			<Keyword text={x.pattern} mono />
		{:else}
			<Keyword text="unspecified" />
		{/if}
	{/snippet}
</DataTable>
