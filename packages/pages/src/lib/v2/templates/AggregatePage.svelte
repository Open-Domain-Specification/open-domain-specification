<script module lang="ts">
export const sections = [
	{ id: "boundary", label: "Consistency boundary" },
	{ id: "structure", label: "Structure" },
	{ id: "invariants", label: "Invariants" },
	{ id: "behaviour", label: "Provides" },
	{ id: "integration", label: "Integration" },
];
</script>

<script lang="ts">
import {
	type Aggregate,
	type Consumable,
	ODSConsumableMap,
	ODSRelationMap,
} from "@open-domain-specification/core";
import { consumableGraph, relationGraph } from "../../flow/graph";
import { problemsUnder, useModel } from "../../model";
import Definition from "../Definition.svelte";
import DefinitionList from "../DefinitionList.svelte";
import EmptyState from "../EmptyState.svelte";
import Heading from "../Heading.svelte";
import Keyword from "../Keyword.svelte";
import Lockup from "../Lockup.svelte";
import ConsumableSubsection from "../molecules/ConsumableSubsection.svelte";
import ConsumesTable from "../molecules/ConsumesTable.svelte";
import { contextCrumbs } from "../molecules/crumbs";
import StructureSubsection from "../molecules/StructureSubsection.svelte";
import DiagramFigure from "../organisms/DiagramFigure.svelte";
import InvariantsSection from "../organisms/InvariantsSection.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";

/** The consistency boundary: what is inside it, what it guarantees, and what it provides. */
const { aggregate: a }: { aggregate: Aggregate } = $props();
const model = useModel();
const bc = $derived(a.boundedcontext);
const entities = $derived(
	[...a.entities.values()].sort((x, y) => Number(y.root) - Number(x.root)),
);
const valueobjects = $derived([...a.valueobjects.values()]);
const invariants = $derived([...a.invariants.values()]);
const consumables = $derived([...a.consumables.values()]);
const operations = $derived(consumables.filter((c) => c.type === "operation"));
const events = $derived(consumables.filter((c) => c.type === "event"));
const root = $derived(entities.find((e) => e.root));
const relationMap = $derived(ODSRelationMap.fromAggregate(a));
const consumableMap = $derived(ODSConsumableMap.fromAggregate(a));
const relationCaption = $derived(`${a.name} relation map`);
const consumableCaption = $derived(`${a.name} consumable map`);
const raisersOf = (event: Consumable) =>
	operations.filter((o) => o.raisedEvents.includes(event));
</script>

<PageHeader
	kind="aggregate"
	kindLabel="Aggregate"
	name={a.name}
	id={a.id}
	description={a.description}
	crumbs={contextCrumbs(model.workspace, bc)}
>
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Root">
				{#if root}<Lockup kind="entity" name={root.name} ref={root.ref} />{:else}<Keyword
						text="no root entity"
						tone="error"
						title="An aggregate needs exactly one root entity that guards its invariants."
					/>{/if}
			</Definition>
			<Definition term="Context"><Lockup kind="boundedcontext" name={bc.name} ref={bc.ref} /></Definition>
		</DefinitionList>
	{/snippet}
</PageHeader>

<Section
	id="boundary"
	title="Consistency boundary"
	lead="Everything inside changes together, in one transaction, through the root. References to other aggregates are by identity only."
	problems={model.diagnostics.filter((d) => d.ref === a.ref)}
>
	<DiagramFigure caption={relationCaption} emptyText="No entities or value objects yet." graph={relationGraph(relationMap)} />
</Section>

<Section
	id="structure"
	title="Structure"
	lead="Entities have identity and a lifecycle; value objects are defined by their attributes and are replaced, not changed."
	count={entities.length + valueobjects.length}
	problems={[...entities, ...valueobjects].flatMap((e) => problemsUnder(model, e.ref))}
>
	<Heading level={3} count={entities.length}>Entities</Heading>
	{#each entities as e (e.ref)}<StructureSubsection element={e} />{:else}<EmptyState text="No entities. An aggregate needs a root entity." />{/each}
	<Heading level={3} count={valueobjects.length}>Value objects</Heading>
	{#each valueobjects as v (v.ref)}<StructureSubsection element={v} />{:else}<EmptyState text="No value objects." />{/each}
</Section>

<InvariantsSection
	{invariants}
	title="Invariants"
	withTargets
	lead="Rules that must hold after every change. The root enforces them; the elements they constrain are listed."
	emptyText="No invariants stated. If nothing can go wrong, is this really an aggregate?"
	problems={invariants.flatMap((i) => problemsUnder(model, i.ref))}
/>

<Section
	id="behaviour"
	title="Provides"
	lead="Operations express intent and are accepted or rejected by the root; events record what happened and cannot be refused. Internal ones never leave the context."
	count={consumables.length}
	problems={consumables.flatMap((x) => problemsUnder(model, x.ref))}
>
	<Heading level={3} count={operations.length}>Operations</Heading>
	{#each operations as c (c.ref)}<ConsumableSubsection consumable={c} />{:else}<EmptyState text="No operations. How does state change?" />{/each}
	<Heading level={3} count={events.length}>Events</Heading>
	{#each events as e (e.ref)}<ConsumableSubsection consumable={e} raisedBy={raisersOf(e)} />{:else}<EmptyState text="No events. Nothing outside will ever know what happened here." />{/each}
</Section>

<Section
	id="integration"
	title="Integration"
	lead="What this aggregate relies on from elsewhere."
	count={a.consumptions.length}
>
	<DiagramFigure caption={consumableCaption} emptyText="Depends on nothing outside itself." graph={consumableGraph(consumableMap)} />
	<Heading level={3} count={a.consumptions.length}>Consumes</Heading>
	<ConsumesTable consumptions={a.consumptions} />
</Section>
