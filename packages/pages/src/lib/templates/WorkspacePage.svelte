<script module lang="ts">
export const sections = [
	{ id: "problem", label: "Problem space" },
	{ id: "solution", label: "Solution space" },
	{ id: "teams", label: "Teams" },
	{ id: "health", label: "Health" },
];
</script>

<script lang="ts">
import { ODSContextMap } from "@open-domain-specification/core";
import Markdown from "../atoms/Markdown.svelte";
import { contextGraph } from "../flow/graph";
import { problemsUnder, useModel } from "../model";
import { HEALTH_REF } from "../resolve";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Definition from "../atoms/Definition.svelte";
import DefinitionList from "../atoms/DefinitionList.svelte";
import EmptyState from "../atoms/EmptyState.svelte";
import Heading from "../atoms/Heading.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import ContextList from "../molecules/ContextList.svelte";
import ContextLockup from "../molecules/ContextLockup.svelte";
import Joined from "../molecules/Joined.svelte";
import Problems from "../molecules/Problems.svelte";
import SubdomainTable from "../molecules/SubdomainTable.svelte";
import TeamLockup from "../molecules/TeamLockup.svelte";
import DiagramFigure from "../organisms/DiagramFigure.svelte";
import HealthReport from "../organisms/HealthReport.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";
import Ref from "../atoms/Ref.svelte";

/**
 * The whole workspace, the page an architect opens first. The version and the
 * file, which v1 drew as two chips beside the title, are two definitions; each
 * domain is a level-3 subsection with its own subdomain table, so the domain's
 * description stays with the rows it explains; contexts and teams are tables.
 * The green tick line loses its colour — the pass codicon in the icon colour
 * and one secondary sentence — because a VS Code surface does not paint good
 * news green.
 *
 * v1's two health sections are one here. The reader's question is one, "what
 * is the model unhappy about", with four kinds of answer: Structure is what
 * the rule checker finds, badged with the Problems panel's count; Refactor,
 * Tolerated and No comments are what the model's own evidence says.
 */
const model = useModel();
const ws = model.workspace;
const domains = $derived([...ws.domains.values()]);
const contexts = $derived([...ws.boundedcontexts.values()]);
const teams = $derived([...ws.teams.values()]);
const contextMap = $derived(ODSContextMap.fromWorkspace(ws));

const contextColumns: Column[] = [
	{ key: "name", label: "Context" },
	{ key: "serves", label: "Serves" },
	{ key: "team", label: "Team" },
	{ key: "aggregates", label: "Aggregates", numeric: true },
	{ key: "services", label: "Services", numeric: true },
];
const teamColumns: Column[] = [
	{ key: "name", label: "Team" },
	{ key: "owns", label: "Owns" },
	{ key: "description", label: "Description" },
];
</script>

<PageHeader description={ws.description}>
	{#snippet title()}<Lockup kind="workspace" name={ws.name} id={ws.id} detail="Workspace" size="title" />{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Version">{ws.version}</Definition>
			<Definition term="File">{model.fileLabel}</Definition>
		</DefinitionList>
	{/snippet}
</PageHeader>

<Section
	id="problem"
	title="Problem space"
	lead="Domains group the subdomains the business needs; each subdomain is classified by how much it matters to compete."
	count={domains.length}
	problems={domains.flatMap((d) => problemsUnder(model, d.ref))}
>
	{#each domains as d (d.ref)}
		<Heading level={3} id={d.ref}><Lockup kind="domain" name={d.name} ref={d.ref} /></Heading>
		<Markdown text={d.description} />
		<SubdomainTable subdomains={[...d.subdomains.values()]} empty="No subdomains yet." />
	{:else}
		<EmptyState text="No domains yet. Start by naming what the business does." />
	{/each}
</Section>

<Section
	id="solution"
	title="Solution space"
	lead="Bounded contexts are where models live. The map shows which context is upstream of which and how they protect themselves."
	count={contexts.length}
	problems={contexts.flatMap((bc) => model.diagnostics.filter((d) => d.ref === bc.ref))}
>
	<DiagramFigure
		caption="Context map"
		emptyText="No bounded contexts yet."
		graph={contextGraph(contextMap, ws.relationships)}
	/>
	<DataTable columns={contextColumns} rows={contexts} rowId={(bc) => bc.ref} empty="No bounded contexts yet.">
		{#snippet cell(bc, col)}
			{#if col.key === "name"}
				<ContextLockup context={bc} />
			{:else if col.key === "serves"}
				<Joined>{#each [...bc.subdomains] as s (s.ref)}<Lockup kind="subdomain" name={s.name} ref={s.ref} />{:else}<Keyword text="none" />{/each}</Joined>
			{:else if col.key === "team"}
				<TeamLockup team={bc.team} />
			{:else if col.key === "aggregates"}
				{bc.aggregates.size}
			{:else}
				{bc.services.size}
			{/if}
		{/snippet}
	</DataTable>
</Section>

<Section
	id="teams"
	title="Teams"
	lead="Conway's law runs both ways: one team per context keeps the model coherent."
	count={teams.length}
>
	<DataTable columns={teamColumns} rows={teams} rowId={(t) => t.ref} empty="No teams recorded.">
		{#snippet cell(t, col)}
			{#if col.key === "name"}
				<Lockup kind="team" name={t.name} ref={t.ref} />
			{:else if col.key === "owns"}
				<ContextList contexts={contexts.filter((bc) => bc.team === t)} empty="owns no context" />
			{:else}
				{t.description}
			{/if}
		{/snippet}
	</DataTable>
</Section>

<Section
	id="health"
	title="Health"
	lead="What the model is not happy about. Structure is what the rules ODS checks find; the rest is read off the evidence: what is marked for refactoring, what compromises are tolerated, and what nobody has written anything down about."
>
	<Heading level={3} id="structure" count={model.diagnostics.length}>Structure</Heading>
	{#if model.diagnostics.length}
		<Problems problems={model.diagnostics} />
	{:else}
		<p class="ok"><i class="codicon codicon-pass" aria-hidden="true"></i> No structural problems found.</p>
	{/if}
	<HealthReport />
	<p class="more"><Ref ref={HEALTH_REF} label="Open the full health report" icon="pulse" /></p>
</Section>

<style>
	.ok,
	.more {
		margin: 0;
		line-height: 22px;
		color: var(--vscode-descriptionForeground);
	}
	.codicon-pass {
		color: var(--vscode-icon-foreground);
		font-size: 1em;
		vertical-align: -2px;
		margin-right: 4px;
	}
</style>
