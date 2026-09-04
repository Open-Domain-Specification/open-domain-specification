<script module lang="ts">
export const sections = [
	{ id: "serving", label: "Served by" },
	{ id: "map", label: "Context map" },
];
</script>

<script lang="ts">
import {
	ODSContextMap,
	type Subdomain,
} from "@open-domain-specification/core";
import { contextGraph } from "../../flow/graph";
import { problemsUnder, SUBDOMAIN_TYPE, useModel } from "../../model";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Definition from "../Definition.svelte";
import DefinitionList from "../DefinitionList.svelte";
import Keyword from "../Keyword.svelte";
import Lockup from "../Lockup.svelte";
import ContextLockup from "../molecules/ContextLockup.svelte";
import DiagramFigure from "../organisms/DiagramFigure.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";
import TeamLockup from "../molecules/TeamLockup.svelte";

/**
 * One subdomain. v1 spent a whole section on the classification and said
 * nothing else in it; here the classification is the keyword under the title
 * and one definition in the header, and the page is the contexts that serve
 * this part of the problem.
 */
const { subdomain: s }: { subdomain: Subdomain } = $props();
const model = useModel();
const serving = $derived([...s.boundedcontexts.values()]);
const contextMap = $derived(ODSContextMap.fromSubdomain(s));
const mapCaption = $derived(`${s.name} context map`);
const columns: Column[] = [
	{ key: "name", label: "Context" },
	{ key: "team", label: "Team" },
	{ key: "description", label: "Description" },
];
</script>

<PageHeader
	crumbs={[
		["#", model.workspace.name],
		[s.domain.ref, s.domain.name],
	]}
	description={s.description}
>
	{#snippet title()}<Lockup kind="subdomain" name={s.name} id={s.id} detail="Subdomain" size="title" />{/snippet}
	{#snippet meta()}<Keyword text={s.type} title={SUBDOMAIN_TYPE[s.type]} />{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Classification">{SUBDOMAIN_TYPE[s.type] ?? s.type}</Definition>
		</DefinitionList>
	{/snippet}
</PageHeader>

<Section
	id="serving"
	title="Served by"
	lead="Bounded contexts that implement a model for this subdomain. One context may serve several subdomains, and a subdomain may need several contexts."
	count={serving.length}
	problems={problemsUnder(model, s.ref)}
>
	<DataTable
		{columns}
		rows={serving}
		rowId={(bc) => bc.ref}
		empty="No bounded context serves this subdomain yet."
	>
		{#snippet cell(bc, col)}
			{#if col.key === "name"}
				<ContextLockup context={bc} />
			{:else if col.key === "team"}
				<TeamLockup team={bc.team} />
			{:else}
				{bc.description}
			{/if}
		{/snippet}
	</DataTable>
</Section>

<Section
	id="map"
	title="Context map"
	lead="The contexts serving this subdomain and their neighbours."
>
	<DiagramFigure
		caption={mapCaption}
		emptyText="No bounded context serves this subdomain yet."
		graph={contextGraph(contextMap, model.workspace.relationships)}
	/>
</Section>
