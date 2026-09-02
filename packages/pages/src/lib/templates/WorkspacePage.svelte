<script module lang="ts">
export const sections = [
	{ id: "problem", label: "Problem space" },
	{ id: "solution", label: "Solution space" },
	{ id: "teams", label: "Teams" },
	{ id: "health", label: "Model health" },
];
</script>

<script lang="ts">
	import { ODSContextMap } from "@open-domain-specification/core";
	import Chip from "../atoms/Chip.svelte";
	import Dim from "../atoms/Dim.svelte";
	import Empty from "../atoms/Empty.svelte";
	import Icon from "../atoms/Icon.svelte";
	import Markdown from "../atoms/Markdown.svelte";
	import RefLink from "../atoms/RefLink.svelte";
	import Card from "../molecules/Card.svelte";
	import ContextPill from "../molecules/ContextPill.svelte";
	import Problems from "../molecules/Problems.svelte";
	import SubdomainCard from "../molecules/SubdomainCard.svelte";
	import TeamLine from "../molecules/TeamLine.svelte";
	import { ICONS, problemsUnder, useModel } from "../model";
	import { contextGraph } from "../flow/graph";
	import DiagramFigure from "../organisms/DiagramFigure.svelte";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";

	const model = useModel();
	const ws = model.workspace;
	const domains = [...ws.domains.values()];
	const contexts = [...ws.boundedcontexts.values()];
	const teams = [...ws.teams.values()];
	const contextMap = ODSContextMap.fromWorkspace(ws);
</script>

<PageHeader kind="Workspace" icon={ICONS.workspace} name={ws.name} id={ws.id} description={ws.description}>
	{#snippet meta()}<Chip label="v{ws.version}" tone="muted" /> <Chip label={model.fileLabel} tone="muted" />{/snippet}
</PageHeader>

<Section
	id="problem"
	title="Problem space"
	lead="Domains group the subdomains the business needs; each subdomain is classified by how much it matters to compete."
	problems={domains.flatMap((d) => problemsUnder(model, d.ref))}
>
	{#each domains as d}
		<h3><RefLink ref={d.ref} label={d.name} icon={ICONS.domain} /></h3>
		<Markdown text={d.description} />
		<div class="grid">{#each d.subdomains.values() as s}<SubdomainCard subdomain={s} />{/each}</div>
	{:else}
		<Empty text="No domains yet. Start by naming what the business does." />
	{/each}
</Section>

<Section
	id="solution"
	title="Solution space"
	lead="Bounded contexts are where models live. The map shows which context is upstream of which and how they protect themselves."
	problems={contexts.flatMap((bc) => model.diagnostics.filter((d) => d.ref === bc.ref))}
>
	<DiagramFigure caption="Context map" emptyText="No bounded contexts yet." graph={contextGraph(contextMap)} />
	{#if contexts.length}
		<table>
			<thead><tr><th>Context</th><th>Serves</th><th>Team</th><th>Aggregates</th><th>Services</th></tr></thead>
			<tbody>
				{#each contexts as bc}
					<tr>
						<td><ContextPill context={bc} /></td>
						<td>{#each [...bc.subdomains] as s, i}{#if i}, {/if}<RefLink ref={s.ref} label={s.name} />{:else}<Dim>none</Dim>{/each}</td>
						<td><TeamLine team={bc.team} /></td>
						<td>{bc.aggregates.size}</td>
						<td>{bc.services.size}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<Empty text="No bounded contexts yet." />
	{/if}
</Section>

<Section id="teams" title="Teams" lead="Conway's law runs both ways: one team per context keeps the model coherent.">
	{#if teams.length}
		<div class="grid">
			{#each teams as t}
				<Card ref={t.ref} name={t.name} icon={ICONS.team} description={t.description}>
					<div class="pills">
						{#each contexts.filter((bc) => bc.team === t) as bc}<ContextPill context={bc} />{:else}<Dim>owns no context</Dim>{/each}
					</div>
				</Card>
			{/each}
		</div>
	{:else}
		<Empty text="No teams recorded." />
	{/if}
</Section>

<Section id="health" title="Model health" lead="Structural rules ODS can check. Each entry links to the element concerned.">
	{#if model.diagnostics.length}
		<Problems problems={model.diagnostics} />
	{:else}
		<p class="ok"><Icon name="pass" /> No structural problems found.</p>
	{/if}
</Section>
