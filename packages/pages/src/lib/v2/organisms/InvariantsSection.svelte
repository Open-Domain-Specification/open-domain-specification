<script lang="ts">
import {
	constrainableLabel,
	type Invariant,
} from "@open-domain-specification/core";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Keyword from "../Keyword.svelte";
import Lockup from "../Lockup.svelte";
import Ref from "../Ref.svelte";
import Section from "./Section.svelte";

/**
 * The invariants that constrain an element. v1 gave each one a card holding a
 * single sentence; v2 gives it a row, because a rule and its wording read
 * faster down a column than across a column of frames.
 *
 * `constrains` adds the column the aggregate page needs, listing what each
 * rule names — the whole aggregate when it names nothing in particular.
 */
const {
	invariants,
	lead,
	emptyText,
	id = "invariants",
	title = "Constrained by",
	constrains = false,
}: {
	invariants: Invariant[];
	lead: string;
	emptyText: string;
	id?: string;
	title?: string;
	constrains?: boolean;
} = $props();

const columns = $derived<Column[]>([
	{ key: "name", label: "Invariant" },
	...(constrains ? [{ key: "constrains", label: "Constrains" }] : []),
	{ key: "description", label: "Description" },
]);
</script>

<Section {id} {title} {lead} count={invariants.length}>
	<DataTable {columns} rows={invariants} rowId={(i) => i.ref} empty={emptyText}>
		{#snippet cell(i, col)}
			{#if col.key === "name"}
				<Lockup kind="invariant" name={i.name} ref={i.ref} />
			{:else if col.key === "constrains"}
				{#each i.targets as t, n (t.ref)}{#if n}{", "}{/if}<Ref ref={t.ref} label={constrainableLabel(t)} />{:else}<Keyword text="whole aggregate" />{/each}
			{:else}
				{i.description}
			{/if}
		{/snippet}
	</DataTable>
</Section>
