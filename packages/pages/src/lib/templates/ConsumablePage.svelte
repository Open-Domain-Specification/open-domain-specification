<script module lang="ts">
import type { Consumable } from "@open-domain-specification/core";

export const sectionsFor = (c: Consumable) => {
	const isEvent = c.type === "event";
	return [
		{ id: "payload", label: "Payload" },
		isEvent
			? { id: "raised", label: "Raised by" }
			: { id: "raises", label: "Raises" },
		{ id: "policies", label: isEvent ? "Reacted to by" : "Issued by" },
		{ id: "consumers", label: "Consumed by" },
		{ id: "comments", label: "Comments" },
		{ id: "language", label: "Language" },
	];
};
</script>

<script lang="ts">
import { problemsUnder, useModel } from "../model";
import { consumablesOf, policiesOf } from "../elements";
import Comments from "../atoms/Comments.svelte";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Definition from "../atoms/Definition.svelte";
import DefinitionList from "../atoms/DefinitionList.svelte";
import Disposition from "../atoms/Disposition.svelte";
import EmptyState from "../atoms/EmptyState.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import AttributeTable from "../molecules/AttributeTable.svelte";
import ConsumableKeywords from "../molecules/ConsumableKeywords.svelte";
import ConsumesTable from "../molecules/ConsumesTable.svelte";
import { contextCrumbs } from "../molecules/crumbs";
import { kindOf } from "../molecules/element-kind";
import RefList from "../molecules/RefList.svelte";
import LanguageSection from "../organisms/LanguageSection.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";

/** One event or operation: what it carries, what produces it, and who reacts to it. */
const { consumable: c }: { consumable: Consumable } = $props();
const model = useModel();
const ws = model.workspace;
const provider = $derived(c.provider);
const bc = $derived(provider.boundedcontext);
const isEvent = $derived(c.type === "event");
const raisedBy = $derived(
	[...consumablesOf(ws)].filter((o) => o.raisedEvents.includes(c)),
);
const policies = $derived(
	[...policiesOf(ws)].filter((p) =>
		isEvent ? p.events.includes(c) : p.commands.includes(c),
	),
);
const schemaAttributes = $derived(
	c.schema ? [...c.schema.attributes.values()] : [],
);
const crumbs = $derived<[string, string][]>([
	...contextCrumbs(ws, bc),
	[provider.ref, provider.name],
]);
const policyColumns: Column[] = [
	{ key: "name", label: "Policy" },
	{ key: "context", label: "Context" },
	{ key: "description", label: "Description" },
];
</script>

<PageHeader description={c.description} {crumbs}>
	{#snippet title()}<Lockup
			kind={kindOf(c)}
			name={c.name}
			id={c.id}
			detail={isEvent ? "Event" : "Operation"}
			size="title"
		/>{/snippet}
	{#snippet meta()}<ConsumableKeywords consumable={c} />{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Provided by"><Lockup kind={kindOf(provider)} name={provider.name} ref={provider.ref} /></Definition>
			<Definition term="Payload">
				{#if c.schema}<Lockup kind="schema" name={c.schema.name} ref={c.schema.ref} />{:else}<Keyword text="no schema" />{/if}
			</Definition>
			{#if c.disposition && c.disposition !== "by-design"}
				<Definition term="Disposition"><Disposition disposition={c.disposition} /></Definition>
			{/if}
		</DefinitionList>
	{/snippet}
</PageHeader>

<Section
	id="payload"
	title="Payload"
	lead={isEvent
		? "An event is a fact in the past tense. Carry what a consumer needs to react without asking back."
		: "An operation is an intent. The provider may refuse it; carry what it needs to decide."}
	count={schemaAttributes.length}
	problems={problemsUnder(model, c.ref)}
>
	{#if c.schema}
		<AttributeTable attributes={schemaAttributes} empty="The schema has no attributes." />
	{:else}
		<EmptyState text="No schema declared." />
	{/if}
</Section>

{#if isEvent}
	<Section id="raised" title="Raised by" lead="Operations whose success produces this event." count={raisedBy.length}>
		{#if raisedBy.length}
			<RefList items={raisedBy} kind="command" block />
		{:else}
			<EmptyState text="No operation raises this event. Is it ever emitted?" />
		{/if}
	</Section>
{:else}
	<Section id="raises" title="Raises" lead="Events produced when the operation is accepted." count={c.raisedEvents.length}>
		{#if c.raisedEvents.length}
			<RefList items={c.raisedEvents} kind="event" block />
		{:else}
			<EmptyState text="Raises nothing. Its effect is invisible to the rest of the system." />
		{/if}
	</Section>
{/if}

<Section
	id="policies"
	title={isEvent ? "Reacted to by" : "Issued by policies"}
	lead={isEvent
		? "Policies triggered by this event."
		: "Policies that issue this operation in reaction to events."}
	count={policies.length}
>
	<DataTable
		columns={policyColumns}
		rows={policies}
		empty={isEvent
			? "No policy reacts to this event."
			: "No policy issues this operation; it comes from users or application services."}
		rowId={(p) => p.ref}
	>
		{#snippet cell(p, col)}
			{#if col.key === "name"}
				<Lockup kind="policy" name={p.name} ref={p.ref} />
			{:else if col.key === "context"}
				<Lockup kind="boundedcontext" name={p.boundedcontext.name} ref={p.boundedcontext.ref} />
			{:else}
				{p.description}
			{/if}
		{/snippet}
	</DataTable>
</Section>

<Section
	id="consumers"
	title="Consumed by"
	lead={c.internal
		? "Internal consumables stay inside their context, so nothing outside can consume them."
		: "Downstream consumers and how each protects its model from this upstream."}
	count={c.internal ? 0 : c.consumptions.length}
>
	{#if c.internal}
		<EmptyState text="Internal to the context." />
	{:else}
		<ConsumesTable consumptions={c.consumptions} empty="Nobody consumes this yet." />
	{/if}
</Section>

<Section
	id="comments"
	title="Comments"
	lead="What is known about the real system behind this consumable, each statement backed by what it was read from."
	count={c.comments.length}
>
	<Comments comments={c.comments} empty="No comments recorded for this consumable yet." />
</Section>

<LanguageSection target={c} />
