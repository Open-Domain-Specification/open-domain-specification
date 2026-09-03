<script lang="ts">
import Chip from "../atoms/Chip.svelte";
import DispositionChip from "../atoms/DispositionChip.svelte";
import Empty from "../atoms/Empty.svelte";
import RefLink from "../atoms/RefLink.svelte";
import { type EvidenceRow, health } from "../evidence/derive";
import {
	type CommentSheetIndex,
	PATTERN_SUMMARIES,
} from "../evidence/fixtures";
import { isSymmetricRelationship } from "../flow/graph";
import CommentList from "../molecules/CommentList.svelte";
import { ICONS, useModel } from "../model";

/**
 * The workspace read of the evidence layer (RFC-002 section 4.5): what is
 * marked for refactoring, what compromises are tolerated, and what carries no
 * comments at all. The strip at the top is the number a product owner reads to
 * answer "is the map true, and is it what we want?"; everything below it is
 * the backlog behind those numbers.
 *
 * The no-comments section starts collapsed: it is a reconciliation to-do list
 * for the skill rather than something the architecture is unhappy about.
 */
const { sheets }: { sheets: CommentSheetIndex } = $props();

const model = useModel();
const report = $derived(health(model.workspace, sheets));
const refactorCount = $derived(
	report.refactor.reduce((n, g) => n + g.rows.length, 0),
);
let showNoFacts = $state(false);
const noFactsLabel = $derived(`No comments (${report.noFacts.length})`);
</script>

<div class="health-report">
	<ul class="summary">
		<li class:zero={refactorCount === 0}>
			<strong>{refactorCount}</strong> to refactor
		</li>
		<li class:zero={report.tolerated.length === 0}>
			<strong>{report.tolerated.length}</strong> tolerated
		</li>
		<li class:zero={report.noFacts.length === 0}>
			<strong>{report.noFacts.length}</strong> with no comments
		</li>
	</ul>

	<h3>Refactor</h3>
	{#if report.refactor.length}
		{#each report.refactor as group (group.context.ref)}
			<h4><RefLink ref={group.context.ref} label={group.context.name} icon={ICONS.boundedcontext} /></h4>
			{#each group.rows as entry (entry.key)}
				{@render intent(entry)}
			{/each}
		{/each}
	{:else}
		<Empty text="Nothing is marked for refactoring." />
	{/if}

	<h3>Tolerated</h3>
	{#if report.tolerated.length}
		{#each report.tolerated as entry (entry.key)}
			{@render intent(entry)}
		{/each}
	{:else}
		<Empty text="No compromises recorded." />
	{/if}

	<h3>
		<button type="button" aria-expanded={showNoFacts} onclick={() => { showNoFacts = !showNoFacts; }}>
			<i class="codicon codicon-chevron-{showNoFacts ? 'down' : 'right'}"></i>
			<span>{noFactsLabel}</span>
		</button>
	</h3>
	{#if showNoFacts}
		{#if report.noFacts.length}
			{#each report.noFacts as entry (entry.key)}
				{@render intent(entry)}
			{/each}
		{:else}
			<Empty text="Every intent carries at least one comment." />
		{/if}
	{/if}
</div>

{#snippet intent(entry: EvidenceRow)}
	{@const r = entry.relationship}
	<article class="intent">
		<div class="intent-head">
			<RefLink ref={r.source.ref} label={r.source.name} icon={ICONS.boundedcontext} />
			<span class="arrow">{isSymmetricRelationship(r.type) ? "↔" : "→"}</span>
			<RefLink ref={r.target.ref} label={r.target.name} icon={ICONS.boundedcontext} />
			<Chip label={r.type} tone="muted" title={PATTERN_SUMMARIES[r.type]} />
			<DispositionChip disposition={entry.sheet?.disposition} />
		</div>
		<CommentList comments={entry.sheet?.comments ?? []} empty="Nothing written down yet." />
	</article>
{/snippet}

<style>
	.summary {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gap);
		margin: 0 0 var(--gap);
		padding: 0;
		list-style: none;
	}
	.summary li {
		flex: 1 1 120px;
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
		color: var(--muted);
	}
	.summary strong {
		display: block;
		font-size: 1.6em;
		color: var(--fg);
	}
	.summary li.zero strong {
		color: var(--muted);
	}
	h3 {
		margin: 16px 0 4px;
	}
	h3 button {
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
	}
	h4 {
		margin: 10px 0 2px;
		font-size: 0.85em;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
	}
	.intent {
		border-left: 2px solid var(--border);
		padding: 2px 0 2px 10px;
		margin-bottom: 8px;
	}
	.intent-head {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
	}
	.arrow {
		color: var(--muted);
	}
</style>
