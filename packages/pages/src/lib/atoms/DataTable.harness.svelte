<script lang="ts">
import type { Disposition as DispositionValue } from "@open-domain-specification/core";
import { PATTERNS } from "@open-domain-specification/core";
import type { Column, Group } from "./DataTable.svelte";
import DataTable from "./DataTable.svelte";
import Disposition from "./Disposition.svelte";
import Keyword from "./Keyword.svelte";
import type { Kind } from "./kinds";
import Lockup from "./Lockup.svelte";
import Ref from "./Ref.svelte";

/**
 * A provides table, the densest thing a context page lists. `grouped` turns
 * it into the strategic position's grouped shape, `sortable` makes the first
 * two headers buttons, `dense` repeats the rows to fourteen, `empty` shows
 * what the table says with nothing to list.
 */
type Row = {
	id: string;
	/** The lockup's kind; the consumable's own `type` (event or operation) is the word the Kind column shows. */
	kind: Kind;
	name: string;
	type: string;
	pattern?: string;
	consumers: string[];
	disposition?: DispositionValue;
};

const {
	grouped = false,
	sortable = false,
	dense = false,
	empty = false,
	detail = false,
}: {
	grouped?: boolean;
	sortable?: boolean;
	dense?: boolean;
	empty?: boolean;
	/** Draws each consumed row's consumers under it, the shape the health report takes. */
	detail?: boolean;
} = $props();

const base: Row[] = [
	{
		id: "pet_registered",
		kind: "event",
		name: "PetRegistered",
		type: "event",
		pattern: "PL",
		consumers: ["InventoryProjection"],
	},
	{
		id: "pet_updated",
		kind: "event",
		name: "PetUpdated",
		type: "event",
		pattern: "PL",
		consumers: [],
	},
	{
		id: "pet_status_changed",
		kind: "event",
		name: "PetStatusChanged",
		type: "event",
		pattern: "PL",
		consumers: ["InventoryProjection"],
		disposition: "tolerated",
	},
	{
		id: "change_pet_status",
		kind: "command",
		name: "ChangePetStatus",
		type: "operation",
		consumers: [],
		disposition: "refactor",
	},
	{
		id: "reserve_pet",
		kind: "command",
		name: "ReservePet",
		type: "operation",
		pattern: "OHS",
		consumers: ["OrderApp"],
	},
	{
		id: "mark_pet_sold",
		kind: "command",
		name: "MarkPetSold",
		type: "operation",
		pattern: "OHS",
		consumers: ["OrderApp"],
	},
	{
		id: "get_pet_summary",
		kind: "command",
		name: "GetPetSummary",
		type: "operation",
		pattern: "OHS",
		consumers: ["OrderApp"],
		disposition: "by-design",
	},
];
const rows = $derived(
	empty
		? []
		: dense
			? [
					...base,
					...base.map((r) => ({ ...r, id: `${r.id}_2`, name: `${r.name}V2` })),
				]
			: base,
);
const groups = $derived<Group<Row>[]>([
	{
		id: "events",
		label: "Events",
		rows: rows.filter((r) => r.kind === "event"),
	},
	{
		id: "operations",
		label: "Operations",
		rows: rows.filter((r) => r.kind === "command"),
	},
]);
const columns = $derived<Column[]>([
	{ key: "name", label: "Consumable", sortable },
	{ key: "type", label: "Kind", sortable },
	{ key: "pattern", label: "Pattern", sortable },
	{ key: "consumerCount", label: "Consumers", numeric: true, width: "6em" },
	{ key: "consumers", label: "Consumed by" },
	{ key: "disposition", label: "Disposition" },
]);
const titleOf = (abbr: string) =>
	Object.values(PATTERNS).find((p) => p.abbreviation === abbr)?.summary;
</script>

<DataTable
	{columns}
	rows={grouped ? undefined : rows}
	groups={grouped ? groups : undefined}
	rowId={(r) => r.id}
	empty="Provides nothing. Add an operation or an event to the aggregate."
	caption={grouped ? "What Pet provides, by kind" : undefined}
	detail={detail ? consumers : undefined}
	hasDetail={(r) => r.consumers.length > 0}
>
	{#snippet cell(row, col)}
		{#if col.key === "name"}
			<Lockup kind={row.kind} name={row.name} ref="#/{row.id}" />
		{:else if col.key === "type"}
			<Keyword text={row.type} />
		{:else if col.key === "pattern"}
			{#if row.pattern}<Keyword text={row.pattern} mono title={titleOf(row.pattern)} />{/if}
		{:else if col.key === "consumerCount"}
			{row.consumers.length}
		{:else if col.key === "consumers"}
			{#each row.consumers as c, i (c)}{#if i}, {/if}<Ref ref="#/{c}" label={c} />{:else}<Keyword text="none" />{/each}
		{:else}
			<Disposition disposition={row.disposition} />
		{/if}
	{/snippet}
</DataTable>

{#snippet consumers(row: Row)}
	<span class="consumers-detail">Consumed by {row.consumers.join(", ")}.</span>
{/snippet}

<style>
	.consumers-detail {
		color: var(--vscode-descriptionForeground);
	}
</style>
