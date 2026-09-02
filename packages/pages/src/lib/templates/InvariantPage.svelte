<script module lang="ts">
export const sections = [
	{ id: "constrains", label: "Constrains" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
	import { Entity, type Invariant } from "@open-domain-specification/core";
	import Empty from "../atoms/Empty.svelte";
	import RefLink from "../atoms/RefLink.svelte";
	import Card from "../molecules/Card.svelte";
	import Fact from "../molecules/Fact.svelte";
	import Grid from "../molecules/Grid.svelte";
	import { ICONS, nameOf, problemsUnder, useModel } from "../model";
	import LanguageSection from "../organisms/LanguageSection.svelte";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";
	import { ownerCrumbs } from "./elements";

	let { invariant: i }: { invariant: Invariant } = $props();
	const model = useModel();
	const ws = model.workspace;
	const a = $derived(i.aggregate);
	const describe = (t: unknown) => (t as { description?: string }).description;
</script>

<PageHeader kind="Invariant" icon={ICONS.invariant} name={i.name} id={i.id} description={i.description} crumbs={ownerCrumbs(ws, a)}>
	{#snippet facts()}
		<Fact label="Enforced by"><RefLink ref={a.ref} label={a.name} icon={ICONS.aggregate} /></Fact>
	{/snippet}
</PageHeader>

<Section
	id="constrains"
	title="Constrains"
	lead="The elements this rule is about. An invariant that spans aggregates cannot be guaranteed in one transaction."
	problems={problemsUnder(model, i.ref)}
>
	{#if i.targets.length}
		<Grid>
			{#each i.targets as t}
				<Card ref={t.ref} name={nameOf(t)} icon={t instanceof Entity ? ICONS.entity : ICONS.valueobject} description={describe(t)} />
			{/each}
		</Grid>
	{:else}
		<Empty text="Applies to the aggregate as a whole." />
	{/if}
</Section>

<LanguageSection target={i} />
