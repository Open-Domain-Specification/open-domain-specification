<script lang="ts">
import { Panel } from "@xyflow/svelte";
import type { Graph } from "./graph";
import type { DiagramKind } from "./kind";
import { legendEntries } from "./legend";
import type { LegendState } from "./legend-state.svelte";
import { LEGEND_PANEL_CLASS } from "./panel-fit";

/**
 * Top-left index of the terms the diagram shows: abbreviations with their
 * full names, line styles and node marks, only those present in the graph.
 *
 * A section that opens and closes from its header, as every VS Code panel
 * does: a chevron and a label in one row, the row is the button, `aria-
 * expanded` says which way it is and `aria-controls` names the list it opens.
 * Collapsed it is that row and nothing else, so the fit reserves a corner
 * rather than a column. `legend-state.svelte.ts` holds which way it is.
 * Nothing renders for a graph with no terms.
 */
let {
	graph,
	kind,
	legend,
}: { graph: Graph; kind: DiagramKind; legend: LegendState } = $props();
const entries = $derived(legendEntries(graph, kind));
const collapsed = $derived(legend.collapsed);
const uid = $props.id();
const terms = `legend-terms-${uid}`;
</script>

{#if entries.length}
	<Panel position="top-left" class={LEGEND_PANEL_CLASS}>
		<button
			class="legend-header"
			type="button"
			aria-expanded={!collapsed}
			aria-controls={terms}
			onclick={legend.toggle}
		>
			<i class={`codicon codicon-chevron-${collapsed ? "right" : "down"}`} aria-hidden="true"></i> Legend
		</button>
		<dl class="legend-terms" id={terms} hidden={collapsed}>
			{#each entries as entry (entry.mark)}
				<dt>{entry.mark}</dt>
				<dd title={entry.title}>{entry.name}</dd>
			{/each}
		</dl>
	</Panel>
{/if}

<style>
	/* The class is panel-fit.ts's LEGEND_PANEL_CLASS; keep the two in step. */
	:global(.diagram-legend) {
		max-width: 240px;
		max-height: calc(100% - 140px);
		overflow: auto;
		padding: 4px 8px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 10px;
		color: var(--muted);
		opacity: 0.85;
	}
	:global(.diagram-legend:hover) { opacity: 1; }
	/* Collapsed, the panel is its one row: no scroller and no room to claim. */
	:global(.diagram-legend:has(.legend-terms[hidden])) { overflow: visible; }
	.legend-header {
		display: flex;
		align-items: center;
		gap: 2px;
		font: inherit;
		font-weight: 600;
		color: var(--fg);
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
	}
	.legend-header:focus-visible {
		outline: 1px solid var(--vscode-focusBorder, var(--accent));
		outline-offset: 2px;
	}
	.legend-header .codicon { font-size: 11px; }
	.legend-terms {
		display: grid;
		grid-template-columns: auto auto;
		column-gap: 8px;
		row-gap: 1px;
		margin: 4px 0 0;
	}
	.legend-terms[hidden] { display: none; }
	dt { font-weight: 600; color: var(--fg); white-space: nowrap; }
	dd { margin: 0; white-space: nowrap; }
</style>
