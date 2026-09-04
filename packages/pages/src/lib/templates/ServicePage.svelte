<script module lang="ts">
export const sections = [{ id: "integration", label: "Integration" }];
</script>

<script lang="ts">
import { ODSConsumableMap, type Service } from "@open-domain-specification/core";
import { consumableGraph } from "../flow/graph";
import { problemsUnder, SERVICE_TYPE, useModel } from "../model";
import Definition from "../atoms/Definition.svelte";
import DefinitionList from "../atoms/DefinitionList.svelte";
import Heading from "../atoms/Heading.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import ConsumesTable from "../molecules/ConsumesTable.svelte";
import { contextCrumbs } from "../molecules/crumbs";
import DiagramFigure from "../organisms/DiagramFigure.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import ProvidesTable from "../molecules/ProvidesTable.svelte";
import Section from "../organisms/Section.svelte";

/** A service: what it opens to other contexts, and what it leans on. */
const { service: s }: { service: Service } = $props();
const model = useModel();
const bc = $derived(s.boundedcontext);
const provides = $derived([...s.consumables.values()]);
const consumableMap = $derived(ODSConsumableMap.fromService(s));
const caption = $derived(`${s.name} consumable map`);
</script>

<PageHeader description={s.description} crumbs={contextCrumbs(model.workspace, bc)}>
	{#snippet title()}<Lockup kind="service" name={s.name} id={s.id} detail="Service" size="title" />{/snippet}
	{#snippet meta()}<Keyword text={s.type} title={SERVICE_TYPE[s.type]} />{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Kind">{SERVICE_TYPE[s.type] ?? s.type}</Definition>
			<Definition term="Context"><Lockup kind="boundedcontext" name={bc.name} ref={bc.ref} /></Definition>
		</DefinitionList>
	{/snippet}
</PageHeader>

<Section
	id="integration"
	title="Integration"
	lead="Operations this service opens to other contexts, and the consumables it depends on."
	count={provides.length + s.consumptions.length}
	problems={problemsUnder(model, s.ref)}
>
	<DiagramFigure
		{caption}
		emptyText="Depends on nothing outside itself."
		graph={consumableGraph(consumableMap)}
	/>
	<Heading level={3} count={provides.length}>Provides</Heading>
	<ProvidesTable consumables={provides} />
	<Heading level={3} count={s.consumptions.length}>Consumes</Heading>
	<ConsumesTable consumptions={s.consumptions} />
</Section>
