<script module lang="ts">
export const sections = [
	{ id: "owns", label: "Owns" },
	{ id: "problem", label: "Problem space" },
];
</script>

<script lang="ts">
import type { Team } from "@open-domain-specification/core";
import { problemsUnder, useModel } from "../../model";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Definition from "../Definition.svelte";
import DefinitionList from "../DefinitionList.svelte";
import Lockup from "../Lockup.svelte";
import ContextLockup from "../molecules/ContextLockup.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";
import SubdomainTable from "../molecules/SubdomainTable.svelte";
import Ref from "../Ref.svelte";

/**
 * One team: what it owns and what part of the problem space that reaches.
 * Both of v1's card grids become tables, so the counts that were a `·`-joined
 * line inside each card become numeric columns a reader can compare down.
 */
const { team: t }: { team: Team } = $props();
const model = useModel();
const ws = model.workspace;
const owned = $derived(
	[...ws.boundedcontexts.values()].filter((bc) => bc.team === t),
);
const subdomains = $derived([
	...new Set(owned.flatMap((bc) => [...bc.subdomains])),
]);
const columns: Column[] = [
	{ key: "name", label: "Context" },
	{ key: "aggregates", label: "Aggregates", numeric: true, width: "8em" },
	{ key: "services", label: "Services", numeric: true, width: "7em" },
	{ key: "description", label: "Description" },
];
</script>

<PageHeader crumbs={[["#", ws.name]]} description={t.description}>
	{#snippet title()}<Lockup kind="team" name={t.name} id={t.id} detail="Team" size="title" />{/snippet}
	{#snippet facts()}
		{#if t.homepage}
			<DefinitionList>
				<Definition term="Homepage"><Ref ref={t.homepage} label={t.homepage} external /></Definition>
			</DefinitionList>
		{/if}
	{/snippet}
</PageHeader>

<Section
	id="owns"
	title="Owns"
	lead="Bounded contexts this team is responsible for. One team per context keeps the model coherent; a context with two owners has two models."
	count={owned.length}
	problems={problemsUnder(model, t.ref)}
>
	<DataTable {columns} rows={owned} rowId={(bc) => bc.ref} empty="Owns no bounded context.">
		{#snippet cell(bc, col)}
			{#if col.key === "name"}
				<ContextLockup context={bc} />
			{:else if col.key === "aggregates"}
				{bc.aggregates.size}
			{:else if col.key === "services"}
				{bc.services.size}
			{:else}
				{bc.description}
			{/if}
		{/snippet}
	</DataTable>
</Section>

<Section
	id="problem"
	title="Problem space covered"
	lead="The subdomains reached through the contexts this team owns. A team spread across core and generic work has split priorities."
	count={subdomains.length}
>
	<SubdomainTable {subdomains} servedBy={false} empty="No subdomains reached." />
</Section>
