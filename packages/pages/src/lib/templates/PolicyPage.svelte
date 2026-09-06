<script module lang="ts">
export const sections = [
	{ id: "when", label: "When" },
	{ id: "then", label: "Then" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
import {
	Answer,
	ODSFlowMap,
	type Policy,
	type ReactionTrigger,
} from "@open-domain-specification/core";
import { problemsUnder, useModel } from "../model";
import { flowGraph } from "../flow/graph";
import { FLOW_MAP_EMPTY, flowMapCaption } from "../flow/flow-graph";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Definition from "../atoms/Definition.svelte";
import DefinitionList from "../atoms/DefinitionList.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import ConsumableKeywords from "../molecules/ConsumableKeywords.svelte";
import { contextCrumbs } from "../molecules/crumbs";
import {
	answerKeyword,
	answerRef,
	kindOf,
} from "../molecules/element-kind";
import DiagramFigure from "../organisms/DiagramFigure.svelte";
import LanguageSection from "../organisms/LanguageSection.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";

/** Whenever X happens, do Y: the events that trigger a policy and the operations it issues. */
const { policy: p }: { policy: Policy } = $props();
const model = useModel();
const bc = $derived(p.boundedcontext);
const crumbs = $derived(contextCrumbs(model.workspace, bc));
// The whole context's chain, with this policy marked: what it sets off is
// drawn in its neighbours' rows, which is the reason to draw it at all.
const flowMap = $derived(ODSFlowMap.fromBoundedContext(bc));

/**
 * Where a trigger comes from: an event's provider, or — for an answer — the
 * one operation the answer names, which is the call this policy made
 * (decision 23, third amendment).
 */
const sourceOf = (trigger: ReactionTrigger) =>
	trigger instanceof Answer ? trigger.operation : trigger.provider;

/**
 * What the name in the first column links to. An answer links to what
 * {@link answerRef} says: the shape it came back as, or the call itself where
 * it came back as nothing. The Provider column says which call either way.
 */
const linkOf = (trigger: ReactionTrigger) =>
	trigger instanceof Answer ? answerRef(trigger) : trigger.ref;


/**
 * Both tables name the kind: what a policy issues is an operation or an event,
 * and what triggers it is an event or an answer (decision 23).
 */
const columnsFor = (label: string): Column[] => [
	{ key: "name", label },
	{ key: "kind", label: "Kind" },
	{ key: "provider", label: "Provider" },
	{ key: "context", label: "Context" },
	{ key: "description", label: "Description" },
];
</script>

{#snippet consumables(rows: ReactionTrigger[], label: string, empty: string)}
	<DataTable columns={columnsFor(label)} {rows} {empty} rowId={(c) => c.ref}>
		{#snippet cell(c, col)}
			{#if col.key === "name"}
				<Lockup kind={kindOf(c)} name={c.name} ref={linkOf(c)} />
			{:else if col.key === "kind"}
				{#if c instanceof Answer}<Keyword text={answerKeyword(c)} />{:else}<ConsumableKeywords consumable={c} />{/if}
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
	{#snippet title()}<Lockup kind="policy" name={p.name} id={p.id} detail="Policy" size="title" />{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Lives in"><Lockup kind="boundedcontext" name={bc.name} ref={bc.ref} /></Definition>
		</DefinitionList>
	{/snippet}
</PageHeader>

<Section
	id="when"
	title="When"
	lead="What triggers this policy: an event, or the answer an operation this context calls comes back with. An event from another context arrives through a consumption; an answer arrives from the call."
	count={p.events.length}
	problems={problemsUnder(model, p.ref)}
>
	{@render consumables(p.events, "Event or answer", "Triggered by nothing.")}
</Section>

<Section id="then" title="Then" lead="The operations the policy issues. Whenever X happens, do Y." count={p.commands.length}>
	{@render consumables(p.commands, "Operation", "Issues nothing.")}
	<!-- The map comes after the last section it summarises. -->
	<DiagramFigure
		caption={flowMapCaption(bc.name)}
		emptyText={FLOW_MAP_EMPTY}
		graph={flowGraph(flowMap, p.ref)}
	/>
</Section>

<LanguageSection target={p} />
