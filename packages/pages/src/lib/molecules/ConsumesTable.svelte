<script lang="ts">
import type { Consumption } from "@open-domain-specification/core";
import { identityKeyOf } from "@open-domain-specification/core";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Ref from "../atoms/Ref.svelte";
import { ICONS } from "../model";
import ContextLockup from "./ContextLockup.svelte";

/**
 * The consumables a context or service depends on, what of it makes the call,
 * and how it protects itself from each. A consumption that names nothing is the whole
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
	empty = "Consumes no consumables.",
}: { consumptions: Consumption[]; empty?: string } = $props();

const AGREEMENT_TITLE = "The relationship this exchange runs under.";

// Where the pair holds one agreement nobody names it (decision 15), so a table
// where no row names one has nothing to show and no column to show it in.
const withAgreement = $derived(consumptions.some((x) => x.relationship));
const columns: Column[] = $derived([
	{ key: "consumable", label: "Consumable" },
	{ key: "provider", label: "Provider" },
	{ key: "context", label: "Context" },
	...(withAgreement ? [{ key: "agreement", label: "Agreement" }] : []),
	{ key: "madeBy", label: "Made By" },
	{ key: "protection", label: "Protection" },
]);
</script>

<DataTable
	{columns}
	rows={consumptions}
	rowId={(x) => x.ref}
	{empty}
>
	{#snippet cell(x, col)}
		{#if col.key === "consumable"}
			<Ref ref={x.consumable} label={x.consumable.name} icon={ICONS.consumption} />
		{:else if col.key === "provider"}
			<Ref ref={x.consumable.provider} label={x.consumable.provider.name} />
		{:else if col.key === "context"}
			<ContextLockup context={x.consumable.provider.boundedcontext} />
		{:else if col.key === "agreement"}
			{#if x.relationship}
				<Ref
					ref={x.relationship}
					label={x.relationship.name ?? x.relationship.type}
					icon={ICONS.relationship}
					title={AGREEMENT_TITLE}
				/>
			{/if}
		{:else if col.key === "madeBy"}
			{#if x.by.length}
				{#each x.by as made (identityKeyOf(made))}<Ref ref={made} label={made.name} />{/each}
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
