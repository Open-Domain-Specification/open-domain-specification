<script module lang="ts">
export const sections = [
	{ id: "subdomains", label: "Subdomains" },
	{ id: "contexts", label: "Contexts" },
];
</script>

<script lang="ts">
import { type Domain, ODSContextMap } from "@open-domain-specification/core";
import { contextGraph } from "../../flow/graph";
import { problemsUnder, useModel } from "../../model";
import Lockup from "../Lockup.svelte";
import DiagramFigure from "../organisms/DiagramFigure.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";
import SubdomainTable from "../molecules/SubdomainTable.svelte";

/**
 * One domain: the parts of the business it names, and the contexts that
 * serve them. v1 laid the subdomains out as a grid of cards; here they are
 * rows, because a reader comparing four subdomains reads down a column.
 */
const { domain: d }: { domain: Domain } = $props();
const model = useModel();
const subs = $derived([...d.subdomains.values()]);
const contextMap = $derived(ODSContextMap.fromDomain(d));
const mapCaption = $derived(`${d.name} context map`);
</script>

<PageHeader crumbs={[["#", model.workspace.name]]} description={d.description}>
	{#snippet title()}<Lockup kind="domain" name={d.name} id={d.id} detail="Domain" size="title" />{/snippet}
</PageHeader>

<Section
	id="subdomains"
	title="Subdomains"
	lead="The parts of this domain, classified as core, supporting or generic. The classification decides where effort goes."
	count={subs.length}
	problems={problemsUnder(model, d.ref)}
>
	<SubdomainTable subdomains={subs} empty="No subdomains yet." />
</Section>

<Section
	id="contexts"
	title="Contexts serving this domain"
	lead="How the solution space lines up against this part of the problem."
>
	<DiagramFigure
		caption={mapCaption}
		emptyText="No contexts serve this domain yet."
		graph={contextGraph(contextMap, model.workspace.relationships)}
	/>
</Section>
