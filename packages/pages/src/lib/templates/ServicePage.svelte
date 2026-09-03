<script module lang="ts">
export const sections = [{ id: "integration", label: "Integration" }];
</script>

<script lang="ts">
	import { ODSConsumableMap, type Service } from "@open-domain-specification/core";
	import Chip from "../atoms/Chip.svelte";
	import RefLink from "../atoms/RefLink.svelte";
	import ConsumesTable from "../molecules/ConsumesTable.svelte";
	import Fact from "../molecules/Fact.svelte";
	import ProvidesTable from "../molecules/ProvidesTable.svelte";
	import { ICONS, problemsUnder, SERVICE_TYPE, useModel } from "../model";
	import { consumableGraph } from "../flow/graph";
	import DiagramFigure from "../organisms/DiagramFigure.svelte";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";

	let { service: s }: { service: Service } = $props();
	const model = useModel();
	const bc = $derived(s.boundedcontext);
	const consumableMap = $derived(ODSConsumableMap.fromService(s));
</script>

<PageHeader
	kind="Service"
	icon={ICONS.service}
	name={s.name}
	id={s.id}
	description={s.description}
	crumbs={[["#", model.workspace.name], [bc.ref, bc.name]]}
>
	{#snippet meta()}<Chip label={s.type} tone="muted" title={SERVICE_TYPE[s.type]} />{/snippet}
	{#snippet facts()}
		<Fact label="Kind">{SERVICE_TYPE[s.type] ?? s.type}</Fact>
		<Fact label="Context"><RefLink ref={bc.ref} label={bc.name} icon={ICONS.boundedcontext} /></Fact>
	{/snippet}
</PageHeader>

<Section
	id="integration"
	title="Integration"
	lead="Operations this service opens to other contexts, and the consumables it depends on."
	problems={problemsUnder(model, s.ref)}
>
	<DiagramFigure caption="{s.name} consumable map" emptyText="Depends on nothing outside itself." graph={consumableGraph(consumableMap)} />
	<h3>Provides</h3>
	<ProvidesTable consumables={s.consumables.values()} />
	<h3>Consumes</h3>
	<ConsumesTable consumptions={s.consumptions} />
</Section>
