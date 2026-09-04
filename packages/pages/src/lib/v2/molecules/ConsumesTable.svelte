<script lang="ts">
import type { Consumption } from "@open-domain-specification/core";
import { ICONS } from "../../model";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Keyword from "../Keyword.svelte";
import Ref from "../Ref.svelte";
import ContextLockup from "./ContextLockup.svelte";

/** What a context or a service depends on, and how it protects itself from each. */
const { consumptions }: { consumptions: Consumption[] } = $props();

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
	empty="Depends on nothing outside itself."
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
