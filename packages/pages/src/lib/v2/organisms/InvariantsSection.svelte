<script lang="ts">
import type { Diagnostic, Invariant } from "@open-domain-specification/core";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Lockup from "../Lockup.svelte";
import RefList from "../molecules/RefList.svelte";
import Section from "./Section.svelte";

/**
 * The invariants that name an element, or all the invariants of an aggregate.
 * v1 gave each one a card holding a single sentence; here they are rows: the
 * invariant's lockup and its description, which is the last column and wraps.
 * `withTargets` adds the "Constrains" column the aggregate page needs, where
 * an invariant with no targets says `whole aggregate` rather than nothing.
 */
const {
	invariants,
	title = "Constrained by",
	lead,
	emptyText,
	withTargets = false,
	problems = [],
}: {
	invariants: Invariant[];
	title?: string;
	lead: string;
	emptyText: string;
	withTargets?: boolean;
	problems?: Diagnostic[];
} = $props();

const columns = $derived<Column[]>(
	withTargets
		? [
				{ key: "name", label: "Invariant" },
				{ key: "targets", label: "Constrains" },
				{ key: "description", label: "Description" },
			]
		: [
				{ key: "name", label: "Invariant" },
				{ key: "description", label: "Description" },
			],
);
</script>

<Section id="invariants" {title} {lead} count={invariants.length} {problems}>
	<DataTable {columns} rows={invariants} empty={emptyText} rowId={(inv) => inv.ref}>
		{#snippet cell(inv, col)}
			{#if col.key === "name"}
				<Lockup kind="invariant" name={inv.name} ref={inv.ref} />
			{:else if col.key === "targets"}
				<RefList items={inv.targets} empty="whole aggregate" />
			{:else}
				{inv.description}
			{/if}
		{/snippet}
	</DataTable>
</Section>
