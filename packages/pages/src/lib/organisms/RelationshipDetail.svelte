<script lang="ts">
import {
	type ContextRelationship,
	isSymmetricRelationship,
	PATTERNS,
	relationshipTitle,
} from "@open-domain-specification/core";
import Chip from "../atoms/Chip.svelte";
import DispositionChip from "../atoms/DispositionChip.svelte";
import Empty from "../atoms/Empty.svelte";
import Markdown from "../atoms/Markdown.svelte";
import RefLink from "../atoms/RefLink.svelte";
import { crossingConsumables, relationshipLinks } from "../evidence/derive";
import { LINK_KIND_LABELS } from "../evidence/labels";
import { roleLabel } from "../flow/roles";
import { consumableIcon, ICONS, useModel } from "../model";
import Card from "../molecules/Card.svelte";
import CommentList from "../molecules/CommentList.svelte";
import PatternHoverCard from "../molecules/PatternHoverCard.svelte";

/**
 * Everything known about one context relationship, intent and evidence
 * together (RFC-002 section 4.3). The same block serves as the expanded row
 * inside a strategic position table and as a standalone page, so it renders
 * its own heading rather than relying on a page header, and `heading` picks
 * the level that suits where it sits.
 */
const {
	relationship: r,
	heading = "h3",
}: {
	relationship: ContextRelationship;
	heading?: "h1" | "h3";
} = $props();

const model = useModel();
const symmetric = $derived(isSymmetricRelationship(r.type));
const crossings = $derived(crossingConsumables(r, model.workspace));
const links = $derived(relationshipLinks(r, crossings));
const title = $derived(relationshipTitle(r));
/** One card per side; a symmetric relationship gives neither side a role. */
const sides = $derived([
	{ context: r.source, roles: r.upstreamRoles, side: "Upstream" },
	{ context: r.target, roles: r.downstreamRoles, side: "Downstream" },
]);
</script>

<article class="relationship-detail">
	<header>
		<svelte:element this={heading} class="title">{title}</svelte:element>
		<PatternHoverCard pattern={r.type} label={r.type} intent={r} />
		<DispositionChip disposition={r.disposition} />
	</header>

	{#if r.description}
		<Markdown text={r.description} />
	{:else}
		<Empty text="No description on this relationship." />
	{/if}

	<section id="roles">
		<h4>Roles</h4>
		<!-- Neither side of a symmetric relationship plays a role, so the pattern
		     is stated once above both contexts rather than twice inside them. -->
		{#if symmetric}
			<p class="pattern-summary">{PATTERNS[r.type].summary}</p>
		{/if}
		<div class="sides">
			{#each sides as s (s.side)}
				<Card ref={s.context.ref} name={s.context.name} icon={ICONS.boundedcontext}>
					{#snippet meta()}
						{#if !symmetric}<Chip label={s.side.toLowerCase()} tone="muted" />{/if}
					{/snippet}
					{#if !symmetric}
						{#if s.roles.length}
							<ul class="patterns">
								{#each s.roles as role (role)}
									<li>
										<PatternHoverCard pattern={role} intent={r} />
										<span class="pattern-name">{role}</span>
										<span class="pattern-summary">{PATTERNS[role].summary}</span>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="pattern-summary">{PATTERNS[r.type].summary}</p>
						{/if}
					{/if}
				</Card>
			{/each}
		</div>
	</section>

	<section id="comments">
		<h4>Comments</h4>
		<CommentList
			comments={r.comments}
			empty="No comments recorded for this relationship yet."
		/>
	</section>

	<section id="crossings">
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
									<Chip label={roleLabel(c.consumable.pattern) as string} tone="muted" title={PATTERNS[c.consumable.pattern].summary} />
								{/if}
								{#if c.consumption.pattern}
									<Chip label={roleLabel(c.consumption.pattern) as string} tone="muted" title={PATTERNS[c.consumption.pattern].summary} />
								{/if}
							</td>
							<td><RefLink ref={c.consumption.consumer.ref} label={c.consumption.consumer.name} /></td>
							<td><DispositionChip disposition={c.consumable.disposition} /></td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<Empty text="Nothing crosses this boundary; the relationship is strategic only." />
		{/if}
	</section>

	<section id="links">
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
	</section>
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
	/* Each block is a section so the standalone page can link to it, but the
	   detail stays compact: the page-wide 40px section gap would tear it apart,
	   inside a table row above all. */
	.relationship-detail section {
		margin: 0;
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
