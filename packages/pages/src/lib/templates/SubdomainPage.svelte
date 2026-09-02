<script module lang="ts">
export const sections = [
	{ id: "classification", label: "Classification" },
	{ id: "serving", label: "Served by" },
	{ id: "map", label: "Context map" },
];
</script>

<script lang="ts">
	import { ODSContextMap, type Subdomain } from "@open-domain-specification/core";
	import { contextMapToDigraph } from "@open-domain-specification/graphviz";
	import Chip from "../atoms/Chip.svelte";
	import Empty from "../atoms/Empty.svelte";
	import Card from "../molecules/Card.svelte";
	import Grid from "../molecules/Grid.svelte";
	import TeamLine from "../molecules/TeamLine.svelte";
	import { ICONS, problemsUnder, SUBDOMAIN_TYPE, useModel } from "../model";
	import DiagramFigure from "../organisms/DiagramFigure.svelte";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";

	let { subdomain: s }: { subdomain: Subdomain } = $props();
	const model = useModel();
	const serving = $derived([...s.boundedcontexts.values()]);
	const contextMap = $derived(ODSContextMap.fromSubdomain(s));
</script>

<PageHeader
	kind="Subdomain"
	icon={ICONS.subdomain}
	name={s.name}
	id={s.id}
	description={s.description}
	crumbs={[
		["#", model.workspace.name],
		[s.domain.ref, s.domain.name],
	]}
>
	{#snippet meta()}<Chip label={s.type} tone={s.type} title={SUBDOMAIN_TYPE[s.type]} />{/snippet}
</PageHeader>

<Section id="classification" title="Classification" lead={SUBDOMAIN_TYPE[s.type] ?? ""} problems={problemsUnder(model, s.ref)}>
	{""}
</Section>

<Section
	id="serving"
	title="Served by"
	lead="Bounded contexts that implement a model for this subdomain. One context may serve several subdomains, and a subdomain may need several contexts."
>
	{#if serving.length}
		<Grid>
			{#each serving as bc}
				<Card ref={bc.ref} name={bc.name} icon={ICONS.boundedcontext} description={bc.description}>
					{#snippet meta()}{#if bc.bigBallOfMud}<Chip label="big ball of mud" tone="warn" />{/if}{/snippet}
					<p class="dim">Team: <TeamLine team={bc.team} /></p>
				</Card>
			{/each}
		</Grid>
	{:else}
		<Empty text="No bounded context serves this subdomain yet." />
	{/if}
</Section>

<Section id="map" title="Context map" lead="The contexts serving this subdomain and their neighbours.">
	<DiagramFigure
		caption="{s.name} context map"
		dot={contextMapToDigraph(contextMap).toDot()}
		nodeCount={contextMap.nodes.size}
		emptyText="No bounded context serves this subdomain yet."
	/>
</Section>
