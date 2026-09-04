<script lang="ts">
import type { Subdomain } from "@open-domain-specification/core";
import { SUBDOMAIN_TYPE } from "../../model";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Keyword from "../Keyword.svelte";
import Lockup from "../Lockup.svelte";
import ContextList from "./ContextList.svelte";

/**
 * The subdomains of a domain, or the ones a team reaches: v1's
 * `SubdomainCard` grid as rows. The classification loses its colour and
 * becomes a sortable keyword column — an architect scanning for the core
 * subdomains sorts rather than looks for purple — with the classification's
 * meaning as its hover. The description is last so it takes the width.
 *
 * `servedBy` is off where the contexts are not the point: a team's problem
 * space is read for what the team touches, not for who implements it.
 */
const {
	subdomains,
	servedBy = true,
	empty,
}: { subdomains: Subdomain[]; servedBy?: boolean; empty: string } = $props();

const columns = $derived<Column[]>([
	{ key: "name", label: "Subdomain" },
	{ key: "type", label: "Classification", sortable: true },
	...(servedBy ? [{ key: "servedBy", label: "Served by" }] : []),
	{ key: "description", label: "Description" },
]);
</script>

<DataTable
	{columns}
	rows={subdomains}
	rowId={(s) => s.ref}
	sortValue={(s) => s.type}
	{empty}
>
	{#snippet cell(s, col)}
		{#if col.key === "name"}
			<Lockup kind="subdomain" name={s.name} ref={s.ref} />
		{:else if col.key === "type"}
			<Keyword text={s.type} title={SUBDOMAIN_TYPE[s.type]} />
		{:else if col.key === "servedBy"}
			<ContextList contexts={[...s.boundedcontexts.values()]} empty="no context" />
		{:else}
			{s.description}
		{/if}
	{/snippet}
</DataTable>
