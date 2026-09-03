<script lang="ts">
import type { Disposition } from "@open-domain-specification/core";
import { Panel } from "@xyflow/svelte";
import type { Graph } from "../flow/graph";
import type { DiagramKind } from "../flow/kind";
import { legendEntries } from "../flow/legend";
import { DISPOSITION_SUMMARIES } from "./labels";

/**
 * The diagram legend with one extra row per disposition mark the map draws
 * (RFC-002 section 4.2). Everything above the rule is what the shipped legend
 * already lists; below it is what the evidence layer adds, so a reader can
 * tell an outlined badge from a filled one without guessing.
 *
 * A Storybook variant of `LegendPanel`: the shipped panel derives its rows
 * from the graph alone and has nowhere to put marks that come from the
 * overlay.
 */
const {
	graph,
	kind,
	dispositions,
}: { graph: Graph; kind: DiagramKind; dispositions: Disposition[] } = $props();

const MARKS: Record<Disposition, string> = {
	"by-design": "filled badge",
	tolerated: "outlined badge",
	refactor: "warning badge",
};
const entries = $derived(legendEntries(graph, kind));
/** Only the marks this map actually draws; by-design is the unmarked default. */
const marks = $derived(
	(["tolerated", "refactor"] as const).filter((d) => dispositions.includes(d)),
);
</script>

<Panel position="top-left" class="diagram-legend">
	<strong class="legend-header">Legend</strong>
	<dl class="legend-terms">
		{#each entries as entry (entry.mark)}
			<dt>{entry.mark}</dt>
			<dd>{entry.name}</dd>
		{/each}
	</dl>
	{#if marks.length}
		<hr />
		<dl class="legend-terms">
			{#each marks as mark (mark)}
				<dt>{MARKS[mark]}</dt>
				<dd title={DISPOSITION_SUMMARIES[mark]}>{mark}</dd>
			{/each}
		</dl>
	{/if}
</Panel>

<style>
	/* The panel element belongs to <Panel>, so its box has to be styled
	   globally; the same rule the shipped LegendPanel uses. */
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
	}
	.legend-header {
		color: var(--fg);
	}
	.legend-terms {
		display: grid;
		grid-template-columns: auto auto;
		column-gap: 8px;
		row-gap: 1px;
		margin: 4px 0 0;
	}
	dt {
		font-weight: 600;
		color: var(--fg);
		white-space: nowrap;
	}
	dd {
		margin: 0;
		white-space: nowrap;
	}
	hr {
		margin: 6px 0 0;
		border: 0;
		border-top: 1px solid var(--border);
	}
</style>
