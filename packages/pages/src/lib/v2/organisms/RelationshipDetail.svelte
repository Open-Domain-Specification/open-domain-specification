<script lang="ts">
import {
	type ContextRelationship,
	type DownstreamRole,
	isSymmetricRelationship,
	PATTERNS,
	type UpstreamRole,
} from "@open-domain-specification/core";
import Markdown from "../../atoms/Markdown.svelte";
import { crossingConsumables, relationshipLinks } from "../../evidence/derive";
import { LINK_KIND_LABELS } from "../../evidence/labels";
import { roleLabel } from "../../flow/roles";
import { consumableIcon, useModel } from "../../model";
import Comments from "../Comments.svelte";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Definition from "../Definition.svelte";
import DefinitionList from "../DefinitionList.svelte";
import Disposition from "../Disposition.svelte";
import EmptyState from "../EmptyState.svelte";
import Heading from "../Heading.svelte";
import Keyword from "../Keyword.svelte";
import Lockup from "../Lockup.svelte";
import Ref from "../Ref.svelte";
import ContextLockup from "../molecules/ContextLockup.svelte";

/**
 * Everything known about one context relationship, intent and evidence
 * together (RFC-002 section 4.3). The card v1 drew around it — and the two
 * cards inside it that held nothing but a name — are gone: the title is the
 * two context lockups with the arrow between them, the roles are a definition
 * list, the crossings are a table and the links are a definition list keyed by
 * what each one points at.
 *
 * The same block is the expanded row of a strategic position table and a page
 * of its own, so `heading` picks the level of the title; everything inside it
 * stays at the level-3 scale either way, and each part keeps its id so a table
 * of contents can point at it.
 */
const {
	relationship: r,
	heading = "h3",
}: {
	relationship: ContextRelationship;
	heading?: "h1" | "h3";
} = $props();

const model = useModel();
const level = $derived<1 | 3>(heading === "h1" ? 1 : 3);
const symmetric = $derived(isSymmetricRelationship(r.type));
const crossings = $derived(crossingConsumables(r, model.workspace));
const links = $derived(relationshipLinks(r, crossings));
/** Upstream first, as the model reads: source is the side the other protects itself from. */
const sides = $derived([
	{ term: "Upstream", context: r.source, roles: r.upstreamRoles },
	{ term: "Downstream", context: r.target, roles: r.downstreamRoles },
]);
const columns: Column[] = [
	{ key: "consumable", label: "Consumable" },
	{ key: "pattern", label: "Pattern" },
	{ key: "consumer", label: "Consumed by" },
	{ key: "disposition", label: "Disposition" },
];
/** A role's full name and what it means, in core's words, beside its code. */
const patternLine = (role: UpstreamRole | DownstreamRole) =>
	`${PATTERNS[role].name} — ${PATTERNS[role].summary}`;
/** The patterns on a crossing: what the provider publishes as, and what the consumer protects itself with. */
const patternsOf = (crossing: (typeof crossings)[number]) =>
	[crossing.consumable.pattern, crossing.consumption.pattern].filter(
		(p): p is UpstreamRole | DownstreamRole => Boolean(p),
	);
</script>

<div class="relationship-detail">
	<Heading {level}>
		<ContextLockup context={r.source} />
		<span class="arrow">{symmetric ? "↔" : "→"}</span>
		<ContextLockup context={r.target} />
		<Keyword text={r.type} title={PATTERNS[r.type].summary} />
		<Disposition disposition={r.disposition} />
	</Heading>

	{#if r.description}
		<Markdown text={r.description} />
	{:else}
		<EmptyState text="No description on this relationship." />
	{/if}

	<section id="roles">
		<Heading level={3}>Roles</Heading>
		<!-- Neither side of a symmetric relationship plays a role, so the pattern
		     is stated once rather than twice. -->
		{#if symmetric}
			<p class="summary">{PATTERNS[r.type].summary}</p>
		{:else}
			<DefinitionList>
				{#each sides as side (side.term)}
					<Definition term={side.term}>
						<Lockup kind="boundedcontext" name={side.context.name} ref={side.context.ref} />
						{#each side.roles as role (role)}
							<Keyword text={roleLabel(role) as string} mono title={PATTERNS[role].summary} />
							<span class="summary">{patternLine(role)}</span>
						{:else}
							<span class="summary">{PATTERNS[r.type].summary}</span>
						{/each}
					</Definition>
				{/each}
			</DefinitionList>
		{/if}
	</section>

	<section id="comments">
		<Heading level={3} count={r.comments.length}>Comments</Heading>
		<Comments comments={r.comments} empty="No comments recorded for this relationship yet." />
	</section>

	<section id="crossings">
		<Heading level={3} count={crossings.length}>Consumables crossing this boundary</Heading>
		<DataTable
			{columns}
			rows={crossings}
			rowId={(c) => `${c.consumable.ref}:${c.consumption.consumer.ref}`}
			empty="Nothing crosses this boundary; the relationship is strategic only."
		>
			{#snippet cell(c, col)}
				{#if col.key === "consumable"}
					<Ref
						ref={c.consumable.ref}
						label={c.consumable.name}
						icon={consumableIcon(c.consumable)}
						kind={c.consumable.type === "event" ? "event" : "command"}
					/>
				{:else if col.key === "pattern"}
					{#each patternsOf(c) as pattern (pattern)}
						<Keyword
							text={roleLabel(pattern) as string}
							mono
							title={PATTERNS[pattern].summary}
						/>
					{/each}
				{:else if col.key === "consumer"}
					<Ref ref={c.consumption.consumer.ref} label={c.consumption.consumer.name} />
				{:else}
					<Disposition disposition={c.consumable.disposition} />
				{/if}
			{/snippet}
		</DataTable>
	</section>

	<section id="links">
		<Heading level={3}>Links</Heading>
		{#if links.length}
			<DefinitionList>
				{#each links as link (link.url)}
					<Definition term={LINK_KIND_LABELS[link.kind]}>
						<Ref ref={link.url} label={link.label ?? link.url} external />
					</Definition>
				{/each}
			</DefinitionList>
		{:else}
			<EmptyState text="No links yet. The skill's reconciliation pass fills these in." />
		{/if}
	</section>
</div>

<style>
	/* Each part is a section so a page can link to it, but the block stays
	   compact: the page's 32px section gap would tear it apart inside a row. */
	.relationship-detail section {
		margin: 0;
	}
	.arrow,
	.summary {
		color: var(--vscode-descriptionForeground);
	}
	.summary {
		margin: 0;
	}
</style>
