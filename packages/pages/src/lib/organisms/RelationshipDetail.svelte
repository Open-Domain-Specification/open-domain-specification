<script lang="ts">
import type { ContextRelationship } from "@open-domain-specification/core";
import Chip from "../atoms/Chip.svelte";
import DispositionChip from "../atoms/DispositionChip.svelte";
import Empty from "../atoms/Empty.svelte";
import Markdown from "../atoms/Markdown.svelte";
import RefLink from "../atoms/RefLink.svelte";
import {
	crossingConsumables,
	relationshipLinks,
	dispositionOf,
} from "../evidence/derive";
import {
	type CommentSheetIndex,
	LINK_KIND_LABELS,
	PATTERN_SUMMARIES,
	sheetForRelationship,
} from "../evidence/fixtures";
import { isSymmetricRelationship } from "../flow/graph";
import { roleLabel } from "../flow/roles";
import Card from "../molecules/Card.svelte";
import CommentList from "../molecules/CommentList.svelte";
import { consumableIcon, ICONS, useModel } from "../model";

/**
 * Everything known about one context relationship, intent and evidence
 * together (RFC-002 section 4.3). The same block serves as the expanded row
 * inside a strategic position table and as a standalone page, so it renders
 * its own heading rather than relying on a page header, and `heading` picks
 * the level that suits where it sits.
 */
const {
	relationship: r,
	sheets,
	heading = "h3",
}: {
	relationship: ContextRelationship;
	sheets: CommentSheetIndex;
	heading?: "h1" | "h3";
} = $props();

const model = useModel();
const sheet = $derived(sheetForRelationship(sheets, r));
const symmetric = $derived(isSymmetricRelationship(r.type));
const crossings = $derived(crossingConsumables(r, model.workspace, sheets));
const links = $derived(relationshipLinks(sheet, crossings));
/** An arrow for a directed relationship, a double one where neither side leads. */
const title = $derived(
	`${r.source.name} ${symmetric ? "↔" : "→"} ${r.target.name}`,
);
/** One card per side; a symmetric relationship gives neither side a role. */
const sides = $derived([
	{ context: r.source, roles: r.upstreamRoles, side: "Upstream" },
	{ context: r.target, roles: r.downstreamRoles, side: "Downstream" },
]);
</script>

<article class="relationship-detail">
	<header>
		<svelte:element this={heading} class="title">{title}</svelte:element>
		<Chip label={r.type} tone="muted" title={PATTERN_SUMMARIES[r.type]} />
		<DispositionChip disposition={sheet?.disposition} />
	</header>

	{#if r.description}
		<Markdown text={r.description} />
	{:else}
		<Empty text="No description on this relationship." />
	{/if}

	<h4>Roles</h4>
	<div class="sides">
		{#each sides as s (s.side)}
			<Card ref={s.context.ref} name={s.context.name} icon={ICONS.boundedcontext}>
				{#snippet meta()}
					<Chip label={symmetric ? "participant" : s.side.toLowerCase()} tone="muted" />
				{/snippet}
				{#if s.roles.length}
					<ul class="patterns">
						{#each s.roles as role (role)}
							<li>
								<Chip label={roleLabel(role) as string} tone="muted" title={role} />
								<span class="pattern-name">{role}</span>
								<span class="pattern-summary">{PATTERN_SUMMARIES[role]}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="pattern-summary">{PATTERN_SUMMARIES[r.type]}</p>
				{/if}
			</Card>
		{/each}
	</div>

	<h4>Comments</h4>
	<CommentList
		comments={sheet?.comments ?? []}
		empty="No comments recorded for this relationship yet."
	/>

	<h4>Consumables crossing this boundary</h4>
	{#if crossings.length}
		<table class="crossings">
			<thead><tr><th>Consumable</th><th>Pattern</th><th>Consumed by</th><th></th></tr></thead>
			<tbody>
				{#each crossings as c (c.consumable.ref + c.consumption.consumer.ref)}
					<tr>
						<td><RefLink ref={c.consumable.ref} label={c.consumable.name} icon={consumableIcon(c.consumable)} /></td>
						<td>
							{#if c.consumable.pattern}
								<Chip label={roleLabel(c.consumable.pattern) as string} tone="muted" title={PATTERN_SUMMARIES[c.consumable.pattern]} />
							{/if}
							{#if c.consumption.pattern}
								<Chip label={roleLabel(c.consumption.pattern) as string} tone="muted" title={PATTERN_SUMMARIES[c.consumption.pattern]} />
							{/if}
						</td>
						<td><RefLink ref={c.consumption.consumer.ref} label={c.consumption.consumer.name} /></td>
						<td><DispositionChip disposition={c.sheet?.disposition} /></td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<Empty text="Nothing crosses this boundary; the relationship is strategic only." />
	{/if}

	<h4>Links</h4>
	{#if links.length}
		<ul class="links">
			{#each links as link (link.url)}
				<li>
					<span class="kind">{LINK_KIND_LABELS[link.kind]}</span>
					<a href={link.url} rel="external noreferrer">{link.label ?? link.url}</a>
				</li>
			{/each}
		</ul>
	{:else}
		<Empty text="No links yet. The skill's reconciliation pass fills these in." />
	{/if}
</article>

<style>
	.relationship-detail {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: var(--gap);
		background: var(--card);
	}
	header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 6px;
	}
	.title {
		margin: 0;
		font-size: 1.1em;
	}
	h4 {
		margin: 12px 0 4px;
		font-size: 0.85em;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
	}
	.sides {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--gap);
	}
	.patterns {
		margin: 4px 0 0;
		padding-left: 0;
		list-style: none;
	}
	.patterns li {
		margin-bottom: 3px;
	}
	.pattern-name {
		font-weight: 600;
	}
	.pattern-summary {
		color: var(--muted);
	}
	.links {
		margin: 4px 0;
		padding-left: 18px;
	}
	.kind {
		color: var(--muted);
		margin-right: 4px;
	}
	.crossings {
		width: 100%;
	}
</style>
