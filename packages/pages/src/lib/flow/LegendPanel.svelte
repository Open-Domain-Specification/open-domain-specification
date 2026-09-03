<script lang="ts">
import { Panel } from "@xyflow/svelte";
import type { Graph } from "./graph";
import type { DiagramKind } from "./kind";
import { legendEntries } from "./legend";
import { diagramOptions } from "./options.svelte";

/**
 * Top-left index of the terms the diagram shows: abbreviations with their
 * full names, line styles and node marks, only those present in the graph.
 * Collapsible from its header; the collapsed state is remembered with the
 * other diagram options. Nothing renders for a graph with no terms.
 */
let { graph, kind }: { graph: Graph; kind: DiagramKind } = $props();
const entries = $derived(legendEntries(graph, kind));
const collapsed = $derived(diagramOptions.legendCollapsed);
const toggle = () => diagramOptions.set({ legendCollapsed: !collapsed });
</script>

{#if entries.length}
	<Panel position="top-left" class="diagram-legend">
		<button class="legend-header" type="button" aria-expanded={!collapsed} onclick={toggle}>
			<i class={`codicon codicon-chevron-${collapsed ? "right" : "down"}`}></i> Legend
		</button>
		{#if !collapsed}
			<dl class="legend-terms">
				{#each entries as entry (entry.mark)}
					<dt>{entry.mark}</dt>
					<dd title={entry.title}>{entry.name}</dd>
				{/each}
			</dl>
		{/if}
	</Panel>
{/if}

<style>
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
	.legend-header .codicon { font-size: 11px; }
	.legend-terms {
		display: grid;
		grid-template-columns: auto auto;
		column-gap: 8px;
		row-gap: 1px;
		margin: 4px 0 0;
	}
	dt { font-weight: 600; color: var(--fg); white-space: nowrap; }
	dd { margin: 0; white-space: nowrap; }
</style>
