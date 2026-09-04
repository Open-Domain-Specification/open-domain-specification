<script module lang="ts">
/** One column: what it is called, and how its cells sort and align. */
export type Column = {
	key: string;
	label: string;
	sortable?: boolean;
	numeric?: boolean;
	width?: string;
	/**
	 * The column that takes the width the others do not need, and the only one
	 * whose cells wrap. Every other column sits at its content width, so a
	 * prose column that is not the growing one collapses to its longest word.
	 * The last column grows when no column names itself, which is right for a
	 * table that ends in its description; a table whose prose sits mid-row
	 * says which column it is.
	 */
	grow?: boolean;
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
 *
 * A row may carry a `detail`: a second row under it spanning every column,
 * for the content that belongs to the row but not to any one cell — the
 * comments under a health report row, the whole relationship detail under an
 * expanded strategic position row. It is the caller's snippet again, and a
 * caller that renders nothing for a row (an unexpanded one) gets no row.
 */
const {
	columns,
	rows = [],
	groups,
	cell,
	detail,
	hasDetail = () => true,
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
	detail?: Snippet<[T]>;
	/** Which rows the detail row is drawn under; every row by default. */
	hasDetail?: (row: T) => boolean;
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

const sections = $derived(groups ?? [{ id: "all", label: "", rows }]);
const growKey = $derived(
	(columns.find((c) => c.grow) ?? columns[columns.length - 1])?.key,
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
						class:grow={col.key === growKey}
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
							<td class:numeric={col.numeric} class:grow={col.key === growKey}>{@render cell(row, col)}</td>
						{/each}
					</tr>
					{#if detail && hasDetail(row)}
						<tr class="detail"><td colspan={columns.length}>{@render detail(row)}</td></tr>
					{/if}
				{/each}
			</tbody>
		{/each}
	</table>
{/if}

<style>
	/* Every dimension is declared here rather than inherited: the page
	   stylesheet no longer styles bare `table`, `th` or `td`, so a table looks
	   the same wherever it is drawn — a page, a story or a host that loads
	   only part of the sheet. */
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
	td.grow,
	th.grow {
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
	/* A detail row is the row above's content, not a row of its own: it takes
	   no hover and indents to the first cell's text. */
	tr.detail > td {
		padding: 0 8px 4px 24px;
		white-space: normal;
	}
	tbody tr:not(.group, .detail):hover {
		background: var(--vscode-list-hoverBackground);
	}
	/* High contrast themes draw hover as an outline rather than a wash. */
	:global(.vscode-high-contrast) tbody tr:not(.group, .detail):hover td {
		outline: 1px dashed var(--vscode-contrastActiveBorder);
		outline-offset: -1px;
	}
	/* A label row is one cell across the whole table, so it wraps rather than
	   pushing the table wider; it took this from `th:last-child` before the
	   growing column was named. */
	tr.group th {
		padding-top: 8px;
		color: var(--vscode-foreground);
		font-weight: 600;
		white-space: normal;
	}
	tbody + tbody tr.group th {
		padding-top: 12px;
	}
</style>
