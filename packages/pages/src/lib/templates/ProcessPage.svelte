<script module lang="ts">
export const sections = [
	{ id: "starts", label: "Starts" },
	{ id: "when", label: "While it runs" },
	{ id: "then", label: "Then" },
	{ id: "ends", label: "Ends" },
	{ id: "comments", label: "Comments" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
import {
	Answer,
	ODSFlowMap,
	type Process,
	type ReactionTrigger,
} from "@open-domain-specification/core";
import { problemsUnder, useModel } from "../model";
import { flowGraph } from "../flow/graph";
import { FLOW_MAP_EMPTY, flowMapCaption } from "../flow/flow-graph";
import Comments from "../atoms/Comments.svelte";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Definition from "../atoms/Definition.svelte";
import DefinitionList from "../atoms/DefinitionList.svelte";
import Disposition from "../atoms/Disposition.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import ConsumableKeywords from "../molecules/ConsumableKeywords.svelte";
import { contextCrumbs } from "../molecules/crumbs";
import { kindOf } from "../molecules/element-kind";
import DiagramFigure from "../organisms/DiagramFigure.svelte";
import LanguageSection from "../organisms/LanguageSection.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";

/**
 * One process: the reaction that outlives a single event. The policy page's
 * shape, with the two halves of a lifecycle the policy has no room for —
 * what begins an instance and what finishes it — around the same When and
 * Then (decision 23).
 */
const { process: p }: { process: Process } = $props();
const model = useModel();
const bc = $derived(p.boundedcontext);
const crumbs = $derived(contextCrumbs(model.workspace, bc));
// The lifecycle in one picture: what arrives from the left starts or feeds an
// instance, what leaves solid to the right is what it issues, and the one
// dashed edge is what completes it.
const flowMap = $derived(ODSFlowMap.fromBoundedContext(bc));

/**
 * Where a trigger comes from: an event's provider, or — for an answer — the
 * one operation the answer names, which is the call this process made
 * (decision 23, third amendment).
 */
const sourceOf = (trigger: ReactionTrigger) =>
	trigger instanceof Answer ? trigger.operation : trigger.provider;

/**
 * What the name in the first column links to. An answer has no page of its
 * own — it is a call coming back, not an element — so it links to the shape it
 * came back as, and the Provider column says which call.
 */
const linkOf = (trigger: ReactionTrigger) =>
	trigger instanceof Answer ? trigger.schema.ref : trigger.ref;

/** Every table names the kind, since what a process waits for may be an answer. */
const columnsFor = (label: string, withKind: boolean): Column[] => [
	{ key: "name", label },
	...(withKind ? [{ key: "kind", label: "Kind" }] : []),
	{ key: "provider", label: "Provider" },
	{ key: "context", label: "Context" },
	{ key: "description", label: "Description" },
];
</script>

{#snippet consumables(rows: ReactionTrigger[], label: string, withKind: boolean, empty: string)}
	<DataTable columns={columnsFor(label, withKind)} {rows} {empty} rowId={(c) => c.ref}>
		{#snippet cell(c, col)}
			{#if col.key === "name"}
				<Lockup kind={kindOf(c)} name={c.name} ref={linkOf(c)} />
			{:else if col.key === "kind"}
				{#if c instanceof Answer}<Keyword text={c.rejection ? "rejection" : "answer"} />{:else}<ConsumableKeywords consumable={c} />{/if}
			{:else if col.key === "provider"}
				{@const source = sourceOf(c)}
				<Lockup kind={kindOf(source)} name={source.name} ref={source.ref} />
			{:else if col.key === "context"}
				<Lockup kind="boundedcontext" name={c.boundedcontext.name} ref={c.boundedcontext.ref} />
			{:else}
				{c.description}
			{/if}
		{/snippet}
	</DataTable>
{/snippet}

<PageHeader description={p.description} {crumbs}>
	{#snippet title()}<Lockup kind="process" name={p.name} id={p.id} detail="Process" size="title" />{/snippet}
	{#snippet meta()}<Keyword text="stateful" title="A process remembers which of its events have arrived, which is what a policy may not do." />{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Lives in"><Lockup kind="boundedcontext" name={bc.name} ref={bc.ref} /></Definition>
			{#if p.disposition && p.disposition !== "by-design"}
				<Definition term="Disposition"><Disposition disposition={p.disposition} /></Definition>
			{/if}
		</DefinitionList>
	{/snippet}
</PageHeader>

<Section
	id="starts"
	title="Starts"
	lead="The events that begin an instance. From here the process is alive and remembering; what it correlates on is in its description."
	count={p.startEvents.length}
	problems={problemsUnder(model, p.ref)}
>
	{@render consumables(p.startEvents, "Event", false, "Nothing begins an instance.")}
</Section>

<Section
	id="when"
	title="While it runs"
	lead="What a live instance waits for: further events, and the answers the operations it issues come back with. An event from another context arrives through a consumption; an answer arrives from the call."
	count={p.events.length}
>
	{@render consumables(p.events, "Event or answer", true, "Waits for nothing else once it has started.")}
</Section>

<Section
	id="then"
	title="Then"
	lead="The operations the process issues, all of them its own context's. When it issues which is its own business."
	count={p.commands.length}
>
	{@render consumables(p.commands, "Operation", true, "Issues nothing.")}
</Section>

<Section
	id="ends"
	title="Ends"
	lead="What completes an instance: an event, or an answer a call comes back with. Ending on a fact its own operations raise is the normal shape, not a loop."
	count={p.endEvents.length}
>
	{@render consumables(p.endEvents, "Event or answer", true, "Nothing completes an instance, so the model never says how it finishes.")}
	<!-- The map comes after the last section it summarises, so the four
	     headings above have already named everything it draws. -->
	<DiagramFigure
		caption={flowMapCaption(bc.name)}
		emptyText={FLOW_MAP_EMPTY}
		graph={flowGraph(flowMap, p.ref)}
	/>
</Section>

<Section
	id="comments"
	title="Comments"
	lead="What is known about the real system behind this process, each statement backed by what it was read from."
	count={p.comments.length}
>
	<Comments comments={p.comments} empty="No comments recorded for this process yet." />
</Section>

<LanguageSection target={p} />
