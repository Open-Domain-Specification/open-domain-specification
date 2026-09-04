<script module lang="ts">
/** One column: what it is called, and how its cells sort and align. */
export type Column = {
	key: string;
	label: string;
	sortable?: boolean;
	numeric?: boolean;
	width?: string;
};
/** Rows under one label row, for a table that groups what it lists. */
export type Group<R> = { id: string; label: string; rows: R[] };
</script>

<script lang="ts" generics="T">
import type { Snippet } from "svelte";
import EmptyState from "./EmptyState.svelte";

/**
 * The row container of the design language. Where v1 put a card, v2 puts a
 * row: the platform's 22px line, a hover wash from `list.hoverBackground`, a
 * header in the secondary colour with no capitals, and one hairline under the
 * header only, so the eye reads columns down and rows across without a grid
 * of boxes. Rows may be grouped under a label row (the strategic position
 * groups relationships by what they mean from here); a column may be
 * sortable, in which case its header is a button and the sort direction is
 * drawn with a small codicon arrow, as the keybindings editor does.
 *
 * Cells are the caller's: the `cell` snippet receives the row and the column,
 * so a name cell can be a lockup and a pattern cell a keyword without this
 * component knowing either. `rowId` gives each row an anchor so a ref inside
 * the page can scroll to it.
 */
const {
	columns,
	rows = [],
	groups,
	cell,
	rowId,
	sortValue = (row: T, key: string) =>
		String((row as Record<string, unknown>)[key] ?? ""),
	empty = "Nothing to show.",
	caption,
}: {
	columns: Column[];
	rows?: T[];
	groups?: Group<T>[];
	cell: Snippet<[T, Column]>;
	rowId?: (row: T) => string | undefined;
	sortValue?: (row: T, key: string) => string | number;
	empty?: string;
	caption?: string;
} = $props();

let sort = $state<{ key: string; dir: "asc" | "desc" } | undefined>();

const toggle = (key: string) => {
	sort =
		sort?.key === key
			? { key, dir: sort.dir === "asc" ? "desc" : "asc" }
			: { key, dir: "asc" };
};

const ordered = (list: T[]): T[] => {
	const s = sort;
	if (!s) return list;
	const sign = s.dir === "asc" ? 1 : -1;
	return [...list].sort((a, b) => {
		const x = sortValue(a, s.key);
		const y = sortValue(b, s.key);
		return x < y ? -sign : x > y ? sign : 0;
	});
};

const sections = $derived(
	groups ?? [{ id: "all", label: "", rows }],
);
const total = $derived(sections.reduce((n, g) => n + g.rows.length, 0));
const ariaSort = (key: string) =>
	sort?.key === key
		? sort.dir === "asc"
			? "ascending"
			: "descending"
		: undefined;
</script>

{#if total === 0}
	<EmptyState text={empty} />
{:else}
	<table class="data">
		{#if caption}<caption>{caption}</caption>{/if}
		<thead>
			<tr>
				{#each columns as col (col.key)}
					<th
						scope="col"
						class:numeric={col.numeric}
						style:width={col.width}
						aria-sort={ariaSort(col.key)}
					>
						{#if col.sortable}
							<button type="button" onclick={() => toggle(col.key)}>
								{col.label}
								{#if sort?.key === col.key}
									<i class={sort.dir === "asc" ? "codicon codicon-arrow-small-up" : "codicon codicon-arrow-small-down"} aria-hidden="true"></i>
								{/if}
							</button>
						{:else}
							{col.label}
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		{#each sections as group (group.id)}
			<tbody>
				{#if group.label}
					<tr class="group"><th scope="rowgroup" colspan={columns.length}>{group.label}</th></tr>
				{/if}
				{#each ordered(group.rows) as row, i (rowId?.(row) ?? i)}
					<tr id={rowId?.(row)}>
						{#each columns as col (col.key)}
							<td class:numeric={col.numeric}>{@render cell(row, col)}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		{/each}
	</table>
{/if}

<style>
	/* The resets guard against the v1 page stylesheet, which styles bare
	   `table`, `th` and `td` (capitals, hairlines, a smaller size) and stays
	   loaded while the templates move over one by one. */
	.data {
		width: 100%;
		margin: 0;
		border-collapse: collapse;
		font-size: inherit;
		line-height: 22px;
	}
	caption {
		text-align: left;
		color: var(--vscode-descriptionForeground);
		padding: 0 8px 4px;
	}
	th,
	td {
		text-align: left;
		vertical-align: baseline;
		padding: 0 8px;
		border: 0;
		font-size: inherit;
		text-transform: none;
		letter-spacing: normal;
		white-space: nowrap;
	}
	td:last-child,
	th:last-child {
		width: 100%;
		white-space: normal;
	}
	thead th {
		font-weight: 400;
		color: var(--vscode-descriptionForeground);
		border-bottom: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
	}
	thead th button {
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		border-radius: 2px;
	}
	thead th button:hover {
		color: var(--vscode-foreground);
	}
	thead th button:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: 1px;
	}
	thead th .codicon {
		font-size: 0.9em;
		vertical-align: -2px;
	}
	.numeric {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	tbody tr:not(.group):hover {
		background: var(--vscode-list-hoverBackground);
	}
	/* High contrast themes draw hover as an outline rather than a wash. */
	:global(.vscode-high-contrast) tbody tr:not(.group):hover td {
		outline: 1px dashed var(--vscode-contrastActiveBorder);
		outline-offset: -1px;
	}
	tr.group th {
		padding-top: 8px;
		color: var(--vscode-foreground);
		font-weight: 600;
	}
	tbody + tbody tr.group th {
		padding-top: 12px;
	}
</style>
