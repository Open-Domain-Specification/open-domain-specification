<script module lang="ts">
export const sections = [
	{ id: "owns", label: "Owns" },
	{ id: "problem", label: "Problem space" },
];
</script>

<script lang="ts">
	import type { Team } from "@open-domain-specification/core";
	import Chip from "../atoms/Chip.svelte";
	import Empty from "../atoms/Empty.svelte";
	import Icon from "../atoms/Icon.svelte";
	import Card from "../molecules/Card.svelte";
	import Grid from "../molecules/Grid.svelte";
	import SubdomainCard from "../molecules/SubdomainCard.svelte";
	import { ICONS, problemsUnder, useModel } from "../model";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";

	let { team: t }: { team: Team } = $props();
	const model = useModel();
	const ws = model.workspace;
	const owned = $derived([...ws.boundedcontexts.values()].filter((bc) => bc.team === t));
	const subdomains = $derived([...new Set(owned.flatMap((bc) => [...bc.subdomains]))]);
	const crumbs = $derived<[string, string][]>([["#", ws.name]]);
</script>

<PageHeader kind="Team" icon={ICONS.team} name={t.name} id={t.id} description={t.description} {crumbs}>
	{#snippet meta()}
		{#if t.homepage}<a href={t.homepage}><Icon name="link-external" /> homepage</a>{/if}
	{/snippet}
</PageHeader>

<Section
	id="owns"
	title="Owns"
	lead="Bounded contexts this team is responsible for. One team per context keeps the model coherent; a context with two owners has two models."
	problems={problemsUnder(model, t.ref)}
>
	{#if owned.length}
		<Grid>
			{#each owned as bc}
				<Card ref={bc.ref} name={bc.name} icon={ICONS.boundedcontext} description={bc.description}>
					{#snippet meta()}{#if bc.bigBallOfMud}<Chip label="big ball of mud" tone="warn" />{/if}{/snippet}
					<p class="counts">{bc.aggregates.size} aggregates · {bc.services.size} services</p>
				</Card>
			{/each}
		</Grid>
	{:else}
		<Empty text="Owns no bounded context." />
	{/if}
</Section>

<Section id="problem" title="Problem space covered" lead="The subdomains reached through the contexts this team owns. A team spread across core and generic work has split priorities.">
	{#if subdomains.length}
		<Grid>{#each subdomains as s}<SubdomainCard subdomain={s} />{/each}</Grid>
	{:else}
		<Empty text="No subdomains reached." />
	{/if}
</Section>
