<script lang="ts">
import {
	type BoundedContext,
	type ContextRelationship,
	narrativeText,
	relationshipNarrative,
} from "@open-domain-specification/core";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Disposition from "../atoms/Disposition.svelte";
import EmptyState from "../atoms/EmptyState.svelte";
import {
	counterpartOf,
	type EvidenceRow,
	hasEvidence,
	positionGroups,
} from "../evidence/derive";
import { useModel } from "../model";
import ContextLockup from "../molecules/ContextLockup.svelte";
import PatternHover from "../molecules/PatternHover.svelte";
import RelationshipDetail from "./RelationshipDetail.svelte";

/**
 * The strategic position of one context (RFC-002 section 4.1): its
 * relationships grouped by what they mean from here — what it depends on,
 * what depends on it, what it merely works alongside — as the design
 * language's grouped table. v1 drew every value as the same grey pill, so the
 * counterpart (a link), the type, the roles and the disposition all looked
 * alike; here the counterpart is a lockup, type and roles are keywords that
 * disclose the pattern's meaning on hover, roles in the editor font because
 * they are codes from a table, and the disposition is the Problems-panel mark.
 *
 * A row expands in place into the same block a relationship page renders. A
 * context whose relationships carry nothing recorded has nothing to disclose,
 * so the toggle and disposition columns are both left out; one comment or one
 * non-default disposition anywhere brings them back for every row, because a
 * reader who can expand one row expects to be able to try the next.
 */
const { context }: { context: BoundedContext } = $props();

const model = useModel();
const groups = $derived(positionGroups(context, model.workspace.relationships));
const withEvidence = $derived(
	groups.some((g) => g.rows.some((row) => hasEvidence(row.relationship))),
);
let expanded = $state<string | undefined>(undefined);
const toggle = (key: string) => {
	expanded = expanded === key ? undefined : key;
};

/**
 * The generated sentence for a row, read from this context. It is the row's
 * description when the author wrote none, and the counterpart's hover text in
 * every case: the lockup says who, the sentence says what it means.
 */
const narrativeOf = (r: ContextRelationship) =>
	narrativeText(relationshipNarrative(r, context));
/** Names both ends, because a row's own cells only name the counterpart. */
const discloses = (r: ContextRelationship) =>
	`Evidence for ${r.source.name} and ${r.target.name}`;

const columns = $derived<Column[]>([
	...(withEvidence ? [{ key: "toggle", label: "", width: "22px" }] : []),
	{ key: "with", label: "With" },
	// Disposition, not the description, is this table's last column, so the
	// description is the one that has to claim the slack.
	{ key: "description", label: "Description", grow: true },
	{ key: "type", label: "Type" },
	{ key: "upstream", label: "Upstream" },
	{ key: "downstream", label: "Downstream" },
	...(withEvidence ? [{ key: "disposition", label: "Disposition" }] : []),
]);
</script>

{#if groups.length}
	<div class="strategic-position">
		<DataTable
			{columns}
			{groups}
			rowId={(entry) => entry.key}
			detail={withEvidence ? expandedDetail : undefined}
			hasDetail={(entry) => expanded === entry.key}
		>
			{#snippet cell(entry, col)}
				{@const r = entry.relationship}
				{#if col.key === "toggle"}
					<button
						type="button"
						class="toggle"
						aria-expanded={expanded === entry.key}
						aria-label={discloses(r)}
						onclick={() => toggle(entry.key)}
					>
						<i class="codicon codicon-chevron-{expanded === entry.key ? 'down' : 'right'}" aria-hidden="true"></i>
					</button>
				{:else if col.key === "with"}
					<ContextLockup context={counterpartOf(r, context)} title={narrativeOf(r)} />
				{:else if col.key === "description"}
					<span class="description">{r.description ? r.description : narrativeOf(r)}</span>
				{:else if col.key === "type"}
					<PatternHover pattern={r.type} label={r.type} intent={r} />
				{:else if col.key === "upstream"}
					{#each r.upstreamRoles as role (role)}
						<PatternHover pattern={role} mono intent={r} />
					{/each}
				{:else if col.key === "downstream"}
					{#each r.downstreamRoles as role (role)}
						<PatternHover pattern={role} mono intent={r} />
					{/each}
				{:else}
					<Disposition disposition={r.disposition} />
				{/if}
			{/snippet}
		</DataTable>
	</div>
{:else}
	<EmptyState text="No explicit relationships. Consumptions imply upstream and downstream links." />
{/if}

{#snippet expandedDetail(entry: EvidenceRow)}
	<RelationshipDetail relationship={entry.relationship} />
{/snippet}

<style>
	/* The description wraps at the width v1 settled on; the table gives the
	   rest to the columns that do not. */
	.description {
		display: inline-block;
		max-width: 34ch;
		white-space: normal;
	}
	.toggle {
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		color: var(--vscode-icon-foreground);
		border-radius: 2px;
	}
	.toggle:focus-visible {
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: 1px;
	}
	.toggle .codicon {
		font-size: 1em;
		vertical-align: -2px;
	}
</style>
