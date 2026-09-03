<script lang="ts">
import {
	type BoundedContext,
	type ContextRelationship,
	narrativeText,
	relationshipNarrative,
} from "@open-domain-specification/core";
import Dim from "../atoms/Dim.svelte";
import DispositionChip from "../atoms/DispositionChip.svelte";
import Empty from "../atoms/Empty.svelte";
import { counterpartOf, hasEvidence, positionGroups } from "../evidence/derive";
import { useModel } from "../model";
import ContextPill from "../molecules/ContextPill.svelte";
import PatternHoverCard from "../molecules/PatternHoverCard.svelte";
import RelationshipDetail from "./RelationshipDetail.svelte";

/**
 * The strategic position of one context (RFC-002 section 4.1): its
 * relationships grouped by what they mean from here — what it depends on,
 * what depends on it, what it merely works alongside — with the description
 * the model already carries and the disposition at the row end.
 *
 * Every chip carries the pattern's one-line meaning as its tooltip, and a row
 * expands in place into the full relationship detail. Expansion never
 * navigates: the detail is the same block a standalone relationship page
 * renders, drawn inside the table row.
 *
 * A context whose relationships carry nothing recorded has nothing to
 * disclose, so the toggle column, the expandable detail row and the
 * disposition column are all left out and only the plain position — who,
 * what, which roles — is shown. One comment or one non-default disposition
 * anywhere in this context's position brings all three back, for every row: a
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
/** Names both ends, because a row's own cells only name the counterpart. */
const discloses = (r: { source: { name: string }; target: { name: string } }) =>
	`Evidence for ${r.source.name} and ${r.target.name}`;
/**
 * The generated sentence for a row, read from this context. It is the row's
 * description when the author wrote none, and the counterpart pill's hover
 * text in every case: the pill says who, the sentence says what it means.
 */
const narrativeOf = (r: ContextRelationship) =>
	narrativeText(relationshipNarrative(r, context));
</script>

{#if groups.length}
	<table class="strategic-position">
		<thead>
			<tr>
				{#if withEvidence}<th class="toggle"><span class="visually-hidden">Detail</span></th>{/if}
				<th>With</th>
				<th>Description</th>
				<th>Type</th>
				<th>Upstream role</th>
				<th>Downstream role</th>
				{#if withEvidence}<th>Disposition</th>{/if}
			</tr>
		</thead>
		{#each groups as group (group.id)}
			<tbody>
				<tr class="group"><th colspan={withEvidence ? 7 : 5} scope="colgroup">{group.label}</th></tr>
				{#each group.rows as entry (entry.key)}
					{@const r = entry.relationship}
					<tr class="position" class:open={expanded === entry.key}>
						{#if withEvidence}
							<td class="toggle">
								<button
									type="button"
									aria-expanded={expanded === entry.key}
									aria-label={discloses(r)}
									onclick={() => toggle(entry.key)}
								>
									<i class="codicon codicon-chevron-{expanded === entry.key ? 'down' : 'right'}"></i>
								</button>
							</td>
						{/if}
						<td><ContextPill context={counterpartOf(r, context)} title={narrativeOf(r)} /></td>
						<td class="description">{#if r.description}{r.description}{:else}<Dim title="generated">{narrativeOf(r)}</Dim>{/if}</td>
						<td><PatternHoverCard pattern={r.type} label={r.type} intent={r} /></td>
						<td>{#each r.upstreamRoles as role, i (role)}{#if i}{" "}{/if}<PatternHoverCard pattern={role} intent={r} />{/each}</td>
						<td>{#each r.downstreamRoles as role, i (role)}{#if i}{" "}{/if}<PatternHoverCard pattern={role} intent={r} />{/each}</td>
						{#if withEvidence}<td><DispositionChip disposition={r.disposition} /></td>{/if}
					</tr>
					{#if withEvidence && expanded === entry.key}
						<tr class="detail-row">
							<td colspan="7"><RelationshipDetail relationship={r} /></td>
						</tr>
					{/if}
				{/each}
			</tbody>
		{/each}
	</table>
{:else}
	<Empty text="No explicit relationships. Consumptions imply upstream and downstream links." />
{/if}

<style>
	.strategic-position {
		width: 100%;
	}
	.group th {
		text-align: left;
		padding-top: 10px;
		color: var(--muted);
		font-size: 0.85em;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	td.toggle,
	th.toggle {
		width: 22px;
		padding-right: 0;
	}
	td.toggle button {
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
		color: var(--muted);
	}
	td.toggle button:hover {
		color: var(--fg);
	}
	.description {
		max-width: 34ch;
	}
	.detail-row > td {
		padding: 0 0 var(--gap);
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
