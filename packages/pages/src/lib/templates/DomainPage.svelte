<script module lang="ts">
export const sections = [
	{ id: "subdomains", label: "Subdomains" },
	{ id: "contexts", label: "Contexts" },
];
</script>

<script lang="ts">
	import { type Domain, ODSContextMap } from "@open-domain-specification/core";
	import Empty from "../atoms/Empty.svelte";
	import Grid from "../molecules/Grid.svelte";
	import SubdomainCard from "../molecules/SubdomainCard.svelte";
	import { ICONS, problemsUnder, useModel } from "../model";
	import { contextGraph } from "../flow/graph";
	import DiagramFigure from "../organisms/DiagramFigure.svelte";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";

	let { domain: d }: { domain: Domain } = $props();
	const model = useModel();
	const subs = $derived([...d.subdomains.values()]);
	const contextMap = $derived(ODSContextMap.fromDomain(d));
</script>

<PageHeader
	kind="Domain"
	icon={ICONS.domain}
	name={d.name}
	id={d.id}
	description={d.description}
	crumbs={[["#", model.workspace.name]]}
/>

<Section
	id="subdomains"
	title="Subdomains"
	lead="The parts of this domain, classified as core, supporting or generic. The classification decides where effort goes."
	problems={problemsUnder(model, d.ref)}
>
	{#if subs.length}
		<Grid>{#each subs as s}<SubdomainCard subdomain={s} />{/each}</Grid>
	{:else}
		<Empty text="No subdomains yet." />
	{/if}
</Section>

<Section
	id="contexts"
	title="Contexts serving this domain"
	lead="How the solution space lines up against this part of the problem."
>
	<DiagramFigure
		caption="{d.name} context map"
		emptyText="No contexts serve this domain yet."
		graph={contextGraph(contextMap)}
	/>
</Section>
