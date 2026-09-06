<script module lang="ts">
import type { Consumable } from "@open-domain-specification/core";

export const sectionsFor = (c: Consumable) => {
	const isEvent = c.type === "event";
	return [
		{ id: "payload", label: "Payload" },
		// Only an operation answers its caller, and only when it named a shape.
		...(c.returns
			? [{ id: "returns", label: c.returnsMany ? "Returns many" : "Returns" }]
			: []),
		// Likewise for a refusal: only an operation is refused, and only when
		// it named the shape it refuses with.
		...(c.rejects.length ? [{ id: "rejects", label: "Rejects with" }] : []),
		isEvent
			? { id: "raised", label: "Raised by" }
			: { id: "raises", label: "Raises" },
		{ id: "invariants", label: "Invariants" },
		{ id: "policies", label: isEvent ? "Reacted to by" : "Issued by" },
		{ id: "processes", label: isEvent ? "Part of" : "Issued by processes" },
		{ id: "consumers", label: "Consumed by" },
		{ id: "comments", label: "Comments" },
		{ id: "language", label: "Language" },
	];
};
</script>

<script lang="ts">
import { reachedEvents } from "@open-domain-specification/core";
import { problemsUnder, useModel } from "../model";
import { consumablesOf, policiesOf, processesOf } from "../elements";
import Comments from "../atoms/Comments.svelte";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Definition from "../atoms/Definition.svelte";
import DefinitionList from "../atoms/DefinitionList.svelte";
import Disposition from "../atoms/Disposition.svelte";
import Heading from "../atoms/Heading.svelte";
import EmptyState from "../atoms/EmptyState.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import AttributeTable from "../molecules/AttributeTable.svelte";
import ConsumableKeywords from "../molecules/ConsumableKeywords.svelte";
import ConsumesTable from "../molecules/ConsumesTable.svelte";
import Joined from "../molecules/Joined.svelte";
import { contextCrumbs } from "../molecules/crumbs";
import { kindOf } from "../molecules/element-kind";
import RefList from "../molecules/RefList.svelte";
import RejectionList from "../molecules/RejectionList.svelte";
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
/**
 * The events this operation reaches through the operations it calls, minus
 * anything it raises itself. A front that runs an aggregate's transition
 * declares no `raises` of its own, so without this line its Raises section
 * would read as though nothing happens (card 77).
 */
const reached = $derived(
	isEvent
		? []
		: reachedEvents(c).filter((e) => !c.raisedEvents.includes(e)),
);
const policies = $derived(
	[...policiesOf(ws)].filter((p) =>
		isEvent ? p.events.includes(c) : p.commands.includes(c),
	),
);
/**
 * The processes this consumable takes part in, and where in a lifecycle it
 * sits: an event may begin an instance, be waited for, or finish one, and the
 * page says which rather than leaving a reader to open the process (decision
 * 23).
 */
const processes = $derived(
	[...processesOf(ws)].flatMap((p) => {
		const roles = isEvent
			? [
					...(p.startEvents.includes(c) ? ["starts it"] : []),
					...(p.events.includes(c) ? ["waits for it"] : []),
					...(p.endEvents.includes(c) ? ["ends on it"] : []),
				]
			: p.commands.includes(c)
				? ["issues it"]
				: [];
		return roles.length ? [{ process: p, roles }] : [];
	}),
);
const schemaAttributes = $derived(
	c.schema ? [...c.schema.attributes.values()] : [],
);
// The rules that name this consumable: a transition rule is enforced where the
// transition is made, so it reads from the operation as well as from the
// aggregate that declares it.
const invariants = $derived(c.invariants);
const returnsAttributes = $derived(
	c.returns ? [...c.returns.attributes.values()] : [],
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
const processColumns: Column[] = [
	{ key: "name", label: "Process" },
	{ key: "role", label: "In its lifecycle" },
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
			<Definition term={c.schemaMany ? "Payload, many" : "Payload"}>
				{#if c.schema}<Lockup kind="schema" name={c.schema.name} ref={c.schema.ref} />{:else}<Keyword text="no schema" />{/if}
			</Definition>
			{#if c.returns}
				<Definition term={c.returnsMany ? "Returns many" : "Returns"}><Lockup kind="schema" name={c.returns.name} ref={c.returns.ref} /></Definition>
			{/if}
			{#if c.rejections.length}
				<Definition term="Rejects with"><RejectionList rejections={c.rejections} /></Definition>
			{/if}
			{#if c.disposition && c.disposition !== "by-design"}
				<Definition term="Disposition"><Disposition disposition={c.disposition} /></Definition>
			{/if}
		</DefinitionList>
	{/snippet}
</PageHeader>

<Section
	id="payload"
	title={c.schemaMany ? "Payload, many" : "Payload"}
	lead={isEvent
		? "An event is a fact in the past tense. Carry what a consumer needs to react without asking back."
		: c.schemaMany
			? "An operation is an intent. This one takes a list of this shape; the provider may refuse it, so carry what it needs to decide."
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

{#if c.returns}
	<Section
		id="returns"
		title={c.returnsMany ? "Returns many" : "Returns"}
		lead={c.returnsMany
			? "What the caller gets back, as a list of this shape. Callers depend on every attribute here, so removing one is a breaking change."
			: "What the caller gets back. Callers depend on every attribute here, so removing one is a breaking change."}
		count={returnsAttributes.length}
	>
		<AttributeTable attributes={returnsAttributes} empty="The returned schema has no attributes." />
	</Section>
{/if}

{#if c.rejects.length}
	<Section
		id="rejects"
		title="Rejects with"
		lead="What the operation answers with when it refuses. Nothing happened, so none of these is an event; a caller reads them to know why it was told no."
		count={c.rejects.length}
	>
		{#each c.rejections as { schema, many, reasons } (schema.ref)}
			<div class="subsection">
				<Heading level={3} id={schema.ref}>
					<Lockup kind="schema" name={schema.name} ref={schema.ref} />
					<!-- A refusal answered as a root array of that shape rather
					     than one of it, said beside the shape because only some
					     of an operation's refusals may be lists. -->
					{#if many}<Keyword text="many" />{/if}
				</Heading>
				{#if schema.description}<p class="description">{schema.description}</p>{/if}
				{#if reasons.length}
					<!-- The outcomes the contract enumerates for this shape: what a
					     reactor may wait on one of, rather than on any refusal. -->
					<p class="reasons">Refuses for {#each reasons as reason (reason)}<Keyword text={reason} mono />{" "}{/each}</p>
				{/if}
				<AttributeTable attributes={schema.attributes.values()} empty="The rejection schema has no attributes." />
			</div>
		{/each}
	</Section>
{/if}

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
		{:else if !reached.length}
			<EmptyState text="Raises nothing. Its effect is invisible to the rest of the system." />
		{/if}
		{#if reached.length}
			<p class="reached">Through the operations it calls, it also reaches <RefList items={reached} kind="event" />, raised where they happen rather than restated here.</p>
		{/if}
	</Section>
{/if}

<Section
	id="invariants"
	title="Invariants"
	lead="The rules this consumable has to uphold every time it runs."
	count={invariants.length}
>
	{#if invariants.length}
		<RefList items={invariants} kind="invariant" block />
	{:else}
		<EmptyState text="No invariant names this one." />
	{/if}
</Section>

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
	id="processes"
	title={isEvent ? "Part of" : "Issued by processes"}
	lead={isEvent
		? "Processes this event takes part in, and where in each lifecycle it sits."
		: "Processes that issue this operation while an instance of them is running."}
	count={processes.length}
>
	<DataTable
		columns={processColumns}
		rows={processes}
		empty={isEvent
			? "No process starts, waits for or ends on this event."
			: "No process issues this operation."}
		rowId={(row) => row.process.ref}
	>
		{#snippet cell(row, col)}
			{#if col.key === "name"}
				<Lockup kind="process" name={row.process.name} ref={row.process.ref} />
			{:else if col.key === "role"}
				<Joined>{#each row.roles as role (role)}<Keyword text={role} />{/each}</Joined>
			{:else if col.key === "context"}
				<Lockup kind="boundedcontext" name={row.process.boundedcontext.name} ref={row.process.boundedcontext.ref} />
			{:else}
				{row.process.description}
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

<style>
	/* One rejection, told from the next by the space above it rather than by a
	   frame, the same way an entity is told from its neighbour. */
	.subsection {
		margin-bottom: 16px;
	}
	.description {
		margin: 0 0 4px;
		padding: 0 8px;
		max-width: 80ch;
		line-height: 1.5;
	}
	/* A sentence, not a new mark: what the chain reaches reads as prose under
	   the list of what this operation declares (card 77). */
	.reached {
		margin: 4px 0 0;
		padding: 0 8px;
		max-width: 80ch;
		line-height: 1.5;
		color: var(--vscode-descriptionForeground);
	}
</style>
