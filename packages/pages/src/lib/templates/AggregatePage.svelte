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
	import { type Aggregate, ODSConsumableMap, ODSRelationMap } from "@open-domain-specification/core";
	import { consumableMapToDigraph, relationMapToDigraph } from "@open-domain-specification/graphviz";
	import Chip from "../atoms/Chip.svelte";
	import Empty from "../atoms/Empty.svelte";
	import RefLink from "../atoms/RefLink.svelte";
	import Card from "../molecules/Card.svelte";
	import ConsumableCard from "../molecules/ConsumableCard.svelte";
	import ConsumesTable from "../molecules/ConsumesTable.svelte";
	import Fact from "../molecules/Fact.svelte";
	import Grid from "../molecules/Grid.svelte";
	import StructureCard from "../molecules/StructureCard.svelte";
	import { ICONS, nameOf, problemsUnder, useModel } from "../model";
	import DiagramFigure from "../organisms/DiagramFigure.svelte";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";

	let { aggregate: a }: { aggregate: Aggregate } = $props();
	const model = useModel();
	const bc = $derived(a.boundedcontext);
	const entities = $derived([...a.entities.values()].sort((x, y) => Number(y.root) - Number(x.root)));
	const valueobjects = $derived([...a.valueobjects.values()]);
	const invariants = $derived([...a.invariants.values()]);
	const consumables = $derived([...a.consumables.values()]);
	const operations = $derived(consumables.filter((c) => c.type === "operation"));
	const events = $derived(consumables.filter((c) => c.type === "event"));
	const root = $derived(entities.find((e) => e.root));
	const relationMap = $derived(ODSRelationMap.fromAggregate(a));
	const consumableMap = $derived(ODSConsumableMap.fromAggregate(a));
</script>

<PageHeader
	kind="Aggregate"
	icon={ICONS.aggregate}
	name={a.name}
	id={a.id}
	description={a.description}
	crumbs={[["#", model.workspace.name], [bc.ref, bc.name]]}
>
	{#snippet facts()}
		<Fact label="Root">
			{#if root}<RefLink ref={root.ref} label={root.name} icon={ICONS.entity} />{:else}<Chip label="no root entity" tone="warn" title="An aggregate needs exactly one root entity that guards its invariants." />{/if}
		</Fact>
		<Fact label="Context"><RefLink ref={bc.ref} label={bc.name} icon={ICONS.boundedcontext} /></Fact>
	{/snippet}
</PageHeader>

<Section
	id="boundary"
	title="Consistency boundary"
	lead="Everything inside changes together, in one transaction, through the root. References to other aggregates are by identity only."
	problems={model.diagnostics.filter((d) => d.ref === a.ref)}
>
	<DiagramFigure caption="{a.name} relation map" dot={relationMapToDigraph(relationMap).toDot()} nodeCount={relationMap.nodes.size} emptyText="No entities or value objects yet." />
</Section>

<Section
	id="structure"
	title="Structure"
	lead="Entities have identity and a lifecycle; value objects are defined by their attributes and are replaced, not changed."
	problems={[...entities, ...valueobjects].flatMap((e) => problemsUnder(model, e.ref))}
>
	<h3>Entities</h3>
	{#if entities.length}
		<Grid wide>{#each entities as e}<StructureCard element={e} kind="entity" />{/each}</Grid>
	{:else}
		<Empty text="No entities. An aggregate needs a root entity." />
	{/if}
	{#if valueobjects.length}
		<h3>Value objects</h3>
		<Grid wide>{#each valueobjects as v}<StructureCard element={v} kind="valueobject" />{/each}</Grid>
	{/if}
</Section>

<Section
	id="invariants"
	title="Invariants"
	lead="Rules that must hold after every change. The root enforces them; the elements they constrain are listed."
	problems={invariants.flatMap((i) => problemsUnder(model, i.ref))}
>
	{#each invariants as i}
		<Card ref={i.ref} name={i.name} icon={ICONS.invariant} description={i.description}>
			{#if i.targets.length}
				<div class="pills">{#each i.targets as t}<span class="pill"><RefLink ref={t.ref} label={nameOf(t)} /></span>{/each}</div>
			{:else}
				<p class="dim">Constrains the whole aggregate.</p>
			{/if}
		</Card>
	{:else}
		<Empty text="No invariants stated. If nothing can go wrong, is this really an aggregate?" />
	{/each}
</Section>

<Section
	id="behaviour"
	title="Provides"
	lead="Operations express intent and are accepted or rejected by the root; events record what happened and cannot be refused. Internal ones never leave the context."
	problems={consumables.flatMap((x) => problemsUnder(model, x.ref))}
>
	<h3>Operations</h3>
	{#each operations as c}
		<ConsumableCard consumable={c} />
	{:else}
		<Empty text="No operations. How does state change?" />
	{/each}
	<h3>Events</h3>
	{#each events as e}
		<ConsumableCard consumable={e} raisedBy={operations.filter((o) => o.raisedEvents.includes(e))} />
	{:else}
		<Empty text="No events. Nothing outside will ever know what happened here." />
	{/each}
</Section>

<Section id="integration" title="Integration" lead="What this aggregate relies on from elsewhere.">
	<DiagramFigure caption="{a.name} consumable map" dot={consumableMapToDigraph(consumableMap).toDot()} nodeCount={consumableMap.nodes.size} emptyText="Depends on nothing outside itself." />
	<h3>Consumes</h3>
	<ConsumesTable consumptions={a.consumptions} />
</Section>
