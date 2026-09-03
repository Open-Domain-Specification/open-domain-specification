<script lang="ts">
import type { BoundedContext } from "@open-domain-specification/core";
import Chip from "../atoms/Chip.svelte";
import DispositionChip from "../atoms/DispositionChip.svelte";
import Dim from "../atoms/Dim.svelte";
import Empty from "../atoms/Empty.svelte";
import { counterpartOf, positionGroups } from "../evidence/derive";
import {
	type CommentSheetIndex,
	PATTERN_SUMMARIES,
} from "../evidence/fixtures";
import { roleLabel } from "../flow/roles";
import { useModel } from "../model";
import ContextPill from "../molecules/ContextPill.svelte";
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
 */
const {
	context,
	sheets,
}: { context: BoundedContext; sheets: CommentSheetIndex } = $props();

const model = useModel();
const groups = $derived(
	positionGroups(context, model.workspace.relationships, sheets),
);
let expanded = $state<string | undefined>(undefined);
const toggle = (key: string) => {
	expanded = expanded === key ? undefined : key;
};
/** Names both ends, because a row's own cells only name the counterpart. */
const discloses = (r: { source: { name: string }; target: { name: string } }) =>
	`Evidence for ${r.source.name} and ${r.target.name}`;
</script>

{#if groups.length}
	<table class="strategic-position">
		<thead>
			<tr>
				<th class="toggle"><span class="visually-hidden">Detail</span></th>
				<th>With</th>
				<th>Description</th>
				<th>Type</th>
				<th>Upstream role</th>
				<th>Downstream role</th>
				<th>Disposition</th>
			</tr>
		</thead>
		{#each groups as group (group.id)}
			<tbody>
				<tr class="group"><th colspan="7" scope="colgroup">{group.label}</th></tr>
				{#each group.rows as entry (entry.key)}
					{@const r = entry.relationship}
					<tr class="position" class:open={expanded === entry.key}>
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
						<td><ContextPill context={counterpartOf(r, context)} /></td>
						<td class="description">{#if r.description}{r.description}{:else}<Dim>no description</Dim>{/if}</td>
						<td><Chip label={r.type} tone="muted" title={PATTERN_SUMMARIES[r.type]} /></td>
						<td>{#each r.upstreamRoles as role, i (role)}{#if i}{" "}{/if}<Chip label={roleLabel(role) as string} tone="muted" title={PATTERN_SUMMARIES[role]} />{/each}</td>
						<td>{#each r.downstreamRoles as role, i (role)}{#if i}{" "}{/if}<Chip label={roleLabel(role) as string} tone="muted" title={PATTERN_SUMMARIES[role]} />{/each}</td>
						<td><DispositionChip disposition={entry.sheet?.disposition} /></td>
					</tr>
					{#if expanded === entry.key}
						<tr class="detail-row">
							<td colspan="7"><RelationshipDetail relationship={r} {sheets} /></td>
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
