<script lang="ts">
import type { Consumption } from "@open-domain-specification/core";
import { ICONS } from "../../model";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Keyword from "../Keyword.svelte";
import Ref from "../Ref.svelte";
import ContextLockup from "./ContextLockup.svelte";

/**
 * What a context or a service depends on, and how it protects itself from
 * each. The same rows read the other way round on a consumable's page, which
 * lists who consumes *it*, so `empty` is the caller's word for a table with
 * nothing in it.
 */
const {
	consumptions,
	empty = "Depends on nothing outside itself.",
}: { consumptions: Consumption[]; empty?: string } = $props();

const columns: Column[] = [
	{ key: "consumable", label: "Consumable" },
	{ key: "provider", label: "Provider" },
	{ key: "context", label: "Context" },
	{ key: "protection", label: "Protection" },
];
</script>

<DataTable
	{columns}
	rows={consumptions}
	{empty}
>
	{#snippet cell(x, col)}
		{#if col.key === "consumable"}
			<Ref ref={x.consumable.ref} label={x.consumable.name} icon={ICONS.consumption} />
		{:else if col.key === "provider"}
			<Ref ref={x.consumable.provider.ref} label={x.consumable.provider.name} />
		{:else if col.key === "context"}
			<ContextLockup context={x.consumable.provider.boundedcontext} />
		{:else if x.pattern}
			<Keyword text={x.pattern} mono />
		{:else}
			<Keyword text="unspecified" />
		{/if}
	{/snippet}
</DataTable>
