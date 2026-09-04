<script lang="ts">
import {
	isSymmetricRelationship,
	PATTERNS,
} from "@open-domain-specification/core";
import Comments from "../atoms/Comments.svelte";
import type { Column, Group } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Disposition from "../atoms/Disposition.svelte";
import EmptyState from "../atoms/EmptyState.svelte";
import Heading from "../atoms/Heading.svelte";
import Keyword from "../atoms/Keyword.svelte";
import { type EvidenceRow, health, healthCounts } from "../evidence/derive";
import { useModel } from "../model";
import ContextLockup from "../molecules/ContextLockup.svelte";

/**
 * The workspace read of the evidence layer (RFC-002 section 4.5): what is
 * marked for refactoring, what compromises are tolerated, and what carries no
 * comments at all. v1 put three stat tiles in frames above the lists; here the
 * three numbers are the count badges on the three headings, which is how a
 * pane header carries its count, and each section is a table whose comments
 * read as the row's own detail underneath it.
 *
 * The no-comments section stays collapsed: it is a reconciliation to-do list
 * for the skill rather than something the architecture is unhappy about, and
 * its rows have no comments to show under them.
 */
const model = useModel();
const report = $derived(health(model.workspace));
const counts = $derived(healthCounts(report));
let showNoComments = $state(false);

const columns: Column[] = [
	{ key: "intent", label: "Intent" },
	{ key: "type", label: "Type" },
	{ key: "disposition", label: "Disposition" },
];
/** Refactor keeps v1's grouping by the context that owns the change. */
const refactorGroups = $derived<Group<EvidenceRow>[]>(
	report.refactor.map((g) => ({
		id: g.context.ref,
		label: g.context.name,
		rows: g.rows,
	})),
);
</script>

<div class="health-report">
	<Heading level={3} id="refactor" count={counts.refactor}>Refactor</Heading>
	{#if refactorGroups.length}
		{@render intents({ groups: refactorGroups })}
	{:else}
		<EmptyState text="Nothing is marked for refactoring." />
	{/if}

	<Heading level={3} id="tolerated" count={counts.tolerated}>Tolerated</Heading>
	{#if report.tolerated.length}
		{@render intents({ rows: report.tolerated })}
	{:else}
		<EmptyState text="No compromises recorded." />
	{/if}

	<Heading level={3} id="no-comments" count={counts.noComments}>
		<button
			type="button"
			aria-expanded={showNoComments}
			onclick={() => {
				showNoComments = !showNoComments;
			}}
		>
			<i class="codicon codicon-chevron-{showNoComments ? 'down' : 'right'}" aria-hidden="true"></i>
			No comments
		</button>
	</Heading>
	{#if showNoComments}
		{#if report.noComments.length}
			{@render intents({ rows: report.noComments, comments: false })}
		{:else}
			<EmptyState text="Every intent carries at least one comment." />
		{/if}
	{/if}
</div>

{#snippet intents(what: {
	rows?: EvidenceRow[];
	groups?: Group<EvidenceRow>[];
	comments?: boolean;
})}
	<DataTable
		{columns}
		rows={what.rows}
		groups={what.groups}
		rowId={(entry) => entry.key}
		detail={what.comments === false ? undefined : rowComments}
	>
		{#snippet cell(entry, col)}
			{@const r = entry.relationship}
			{#if col.key === "intent"}
				<ContextLockup context={r.source} />
				<span class="arrow">{isSymmetricRelationship(r.type) ? "↔" : "→"}</span>
				<ContextLockup context={r.target} />
			{:else if col.key === "type"}
				<Keyword text={r.type} title={PATTERNS[r.type].summary} />
			{:else}
				<Disposition disposition={r.disposition} />
			{/if}
		{/snippet}
	</DataTable>
{/snippet}

{#snippet rowComments(entry: EvidenceRow)}
	<Comments comments={entry.relationship.comments} empty="Nothing written down yet." />
{/snippet}

<style>
	.arrow {
		color: var(--vscode-descriptionForeground);
		margin: 0 4px;
	}
	/* The chevron a pane header uses for a section that is collapsed; the
	   heading and its badge are the Heading primitive's. */
	button {
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		border-radius: 2px;
	}
	button:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: 1px;
	}
	button .codicon {
		font-size: 1em;
		vertical-align: -2px;
	}
</style>
