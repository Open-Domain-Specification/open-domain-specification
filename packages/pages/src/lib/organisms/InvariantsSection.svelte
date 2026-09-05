<script lang="ts">
import type { Diagnostic, Invariant } from "@open-domain-specification/core";
import { constrainableLabel } from "@open-domain-specification/core";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import Ref from "../atoms/Ref.svelte";
import Section from "./Section.svelte";

/**
 * The invariants that constrain an element. v1 gave each one a card holding a
 * single sentence; v2 gives it a row, because a rule and its wording read
 * faster down a column than across a column of frames.
 *
 * `constrains` adds the column the aggregate and context pages need, listing
 * what each rule names — the boundary that keeps it when it names nothing in
 * particular.
 * `problems` are the diagnostics about the rules themselves, which the
 * section heading carries the way every other section does.
 */
const {
	invariants,
	lead,
	emptyText,
	id = "invariants",
	title = "Constrained by",
	constrains = false,
	problems = [],
}: {
	invariants: Invariant[];
	lead: string;
	emptyText: string;
	id?: string;
	title?: string;
	constrains?: boolean;
	problems?: Diagnostic[];
} = $props();

const columns = $derived<Column[]>([
	{ key: "name", label: "Invariant" },
	...(constrains ? [{ key: "constrains", label: "Constrains" }] : []),
	{ key: "description", label: "Description" },
]);
</script>

<Section {id} {title} {lead} count={invariants.length} {problems}>
	<DataTable {columns} rows={invariants} rowId={(i) => i.ref} empty={emptyText}>
		{#snippet cell(i, col)}
			{#if col.key === "name"}
				<Lockup kind="invariant" name={i.name} ref={i.ref} />
			{:else if col.key === "constrains"}
				{#each i.targets as t, n (t.ref)}{#if n}{", "}{/if}<Ref ref={t.ref} label={constrainableLabel(t)} />{:else}<Keyword text={i.kind === "context" ? "whole context" : "whole aggregate"} />{/each}
			{:else}
				{i.description}
			{/if}
		{/snippet}
	</DataTable>
</Section>
