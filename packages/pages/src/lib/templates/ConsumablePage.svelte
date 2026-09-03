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
	import Dim from "../atoms/Dim.svelte";
	import DispositionChip from "../atoms/DispositionChip.svelte";
	import Empty from "../atoms/Empty.svelte";
	import RefLink from "../atoms/RefLink.svelte";
	import AttributeTable from "../molecules/AttributeTable.svelte";
	import Card from "../molecules/Card.svelte";
	import CommentList from "../molecules/CommentList.svelte";
	import ConsumableChips from "../molecules/ConsumableChips.svelte";
	import ConsumesTable from "../molecules/ConsumesTable.svelte";
	import Fact from "../molecules/Fact.svelte";
	import { consumableIcon, ICONS, problemsUnder, useModel } from "../model";
	import LanguageSection from "../organisms/LanguageSection.svelte";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";
	import { consumablesOf, policiesOf } from "./elements";

	let { consumable: c }: { consumable: Consumable } = $props();
	const model = useModel();
	const ws = model.workspace;
	const provider = $derived(c.provider);
	const bc = $derived(provider.boundedcontext);
	const isEvent = $derived(c.type === "event");
	const raisedBy = $derived([...consumablesOf(ws)].filter((o) => o.raisedEvents.includes(c)));
	const policies = $derived([...policiesOf(ws)].filter((p) => (isEvent ? p.events.includes(c) : p.commands.includes(c))));
	const schemaAttributes = $derived(c.schema ? [...c.schema.attributes.values()] : []);
	const crumbs = $derived<[string, string][]>([["#", ws.name], [bc.ref, bc.name], [provider.ref, provider.name]]);
</script>

<PageHeader kind={isEvent ? "Event" : "Operation"} icon={consumableIcon(c)} name={c.name} id={c.id} description={c.description} {crumbs}>
	{#snippet meta()}<ConsumableChips consumable={c} /><DispositionChip disposition={c.disposition} />{/snippet}
	{#snippet facts()}
		<Fact label="Provided by"><RefLink ref={provider.ref} label={provider.name} icon={"entities" in provider ? ICONS.aggregate : ICONS.service} /></Fact>
		<Fact label="Payload">{#if c.schema}<RefLink ref={c.schema.ref} label={c.schema.name} icon={ICONS.schema} />{:else}<Dim>no schema</Dim>{/if}</Fact>
	{/snippet}
</PageHeader>

<Section
	id="payload"
	title="Payload"
	lead={isEvent
		? "An event is a fact in the past tense. Carry what a consumer needs to react without asking back."
		: "An operation is an intent. The provider may refuse it; carry what it needs to decide."}
	problems={problemsUnder(model, c.ref)}
>
	{#if c.schema}
		<p class="dim"><RefLink ref={c.schema.ref} label={c.schema.name} icon={ICONS.schema} /></p>
		{#if schemaAttributes.length}<AttributeTable attributes={schemaAttributes} />{:else}<Empty text="The schema has no attributes." />{/if}
	{:else}
		<Empty text="No schema declared." />
	{/if}
</Section>

{#if isEvent}
	<Section id="raised" title="Raised by" lead="Operations whose success produces this event.">
		{#if raisedBy.length}
			<div class="pills">{#each raisedBy as o}<span class="pill"><RefLink ref={o.ref} label={o.name} icon={ICONS.command} /></span>{/each}</div>
		{:else}
			<Empty text="No operation raises this event. Is it ever emitted?" />
		{/if}
	</Section>
{:else}
	<Section id="raises" title="Raises" lead="Events produced when the operation is accepted.">
		{#if c.raisedEvents.length}
			<div class="pills">{#each c.raisedEvents as e}<span class="pill"><RefLink ref={e.ref} label={e.name} icon={ICONS.event} /></span>{/each}</div>
		{:else}
			<Empty text="Raises nothing. Its effect is invisible to the rest of the system." />
		{/if}
	</Section>
{/if}

<Section
	id="policies"
	title={isEvent ? "Reacted to by" : "Issued by policies"}
	lead={isEvent ? "Policies triggered by this event." : "Policies that issue this operation in reaction to events."}
>
	{#each policies as p}
		<Card ref={p.ref} name={p.name} icon={ICONS.policy} description={p.description}>
			{#snippet meta()}<RefLink ref={p.boundedcontext.ref} label={p.boundedcontext.name} icon={ICONS.boundedcontext} />{/snippet}
		</Card>
	{:else}
		<Empty text={isEvent ? "No policy reacts to this event." : "No policy issues this operation; it comes from users or application services."} />
	{/each}
</Section>

<Section
	id="consumers"
	title="Consumed by"
	lead={c.internal
		? "Internal consumables stay inside their context, so nothing outside can consume them."
		: "Downstream consumers and how each protects its model from this upstream."}
>
	{#if c.internal}<Empty text="Internal to the context." />{:else}<ConsumesTable consumptions={c.consumptions} />{/if}
</Section>

<Section
	id="comments"
	title="Comments"
	lead="What is known about the real system behind this consumable, each statement backed by what it was read from."
>
	<CommentList comments={c.comments} empty="No comments recorded for this consumable yet." />
</Section>

<LanguageSection target={c} />
