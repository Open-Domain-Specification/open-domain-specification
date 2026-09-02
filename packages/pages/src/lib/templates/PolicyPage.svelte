<script module lang="ts">
export const sections = [
	{ id: "when", label: "When" },
	{ id: "then", label: "Then" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
	import type { Consumable, Policy } from "@open-domain-specification/core";
	import Empty from "../atoms/Empty.svelte";
	import RefLink from "../atoms/RefLink.svelte";
	import Card from "../molecules/Card.svelte";
	import ConsumableChips from "../molecules/ConsumableChips.svelte";
	import Fact from "../molecules/Fact.svelte";
	import Grid from "../molecules/Grid.svelte";
	import { consumableIcon, ICONS, problemsUnder, useModel } from "../model";
	import LanguageSection from "../organisms/LanguageSection.svelte";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";

	let { policy: p }: { policy: Policy } = $props();
	const model = useModel();
	const ws = model.workspace;
	const bc = $derived(p.boundedcontext);
	const crumbs = $derived<[string, string][]>([["#", ws.name], [bc.ref, bc.name]]);
</script>

{#snippet consumableRefCard(c: Consumable)}
	<Card ref={c.ref} name={c.name} icon={consumableIcon(c)} description={c.description}>
		{#snippet meta()}
			<ConsumableChips consumable={c} /> <RefLink ref={c.provider.ref} label={c.provider.name} /> · <RefLink ref={c.boundedcontext.ref} label={c.boundedcontext.name} icon={ICONS.boundedcontext} />
		{/snippet}
	</Card>
{/snippet}

<PageHeader kind="Policy" icon={ICONS.policy} name={p.name} id={p.id} description={p.description} {crumbs}>
	{#snippet facts()}
		<Fact label="Lives in"><RefLink ref={bc.ref} label={bc.name} icon={ICONS.boundedcontext} /></Fact>
	{/snippet}
</PageHeader>

<Section id="when" title="When" lead="The events that trigger this policy. Events from other contexts arrive through a consumption." problems={problemsUnder(model, p.ref)}>
	{#if p.events.length}
		<Grid>{#each p.events as c}{@render consumableRefCard(c)}{/each}</Grid>
	{:else}
		<Empty text="Triggered by nothing." />
	{/if}
</Section>

<Section id="then" title="Then" lead="The operations the policy issues. Whenever X happens, do Y.">
	{#if p.commands.length}
		<Grid>{#each p.commands as c}{@render consumableRefCard(c)}{/each}</Grid>
	{:else}
		<Empty text="Issues nothing." />
	{/if}
</Section>

<LanguageSection target={p} />
