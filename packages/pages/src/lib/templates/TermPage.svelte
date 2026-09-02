<script module lang="ts">
export const sections = [
	{ id: "embodied", label: "Embodied by" },
	{ id: "elsewhere", label: "Elsewhere" },
];
</script>

<script lang="ts">
	import type { GlossaryTerm } from "@open-domain-specification/core";
	import Chip from "../atoms/Chip.svelte";
	import Empty from "../atoms/Empty.svelte";
	import RefLink from "../atoms/RefLink.svelte";
	import Card from "../molecules/Card.svelte";
	import Fact from "../molecules/Fact.svelte";
	import { ICONS, problemsUnder, useModel } from "../model";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";
	import { termsOf } from "./elements";

	let { term: t }: { term: GlossaryTerm } = $props();
	const model = useModel();
	const ws = model.workspace;
	const bc = $derived(t.boundedcontext);
	const embodied = $derived(t.embodiedBy as { ref: string; name?: string; description?: string } | undefined);
	const sameWord = $derived([...termsOf(ws)].filter((x) => x !== t && x.name.toLowerCase() === t.name.toLowerCase()));
	const crumbs = $derived<[string, string][]>([["#", ws.name], [bc.ref, bc.name]]);
</script>

<PageHeader kind="Glossary Term" icon={ICONS.term} name={t.name} id={t.id} description={t.definition} {crumbs}>
	{#snippet meta()}
		{#each t.aliases as a}<Chip label={a} tone="muted" title="alias" />{/each}
	{/snippet}
	{#snippet facts()}
		<Fact label="Language of"><RefLink ref={bc.ref} label={bc.name} icon={ICONS.boundedcontext} /></Fact>
	{/snippet}
</PageHeader>

<Section id="embodied" title="Embodied by" lead="The model element that carries this meaning. Language and model should say the same thing." problems={problemsUnder(model, t.ref)}>
	{#if embodied}
		<Card ref={embodied.ref} name={embodied.name ?? embodied.ref} icon="symbol-misc" description={embodied.description} />
	{:else}
		<Empty text="Not modelled. Either the word is not needed, or the model is missing something." />
	{/if}
</Section>

<Section id="elsewhere" title="Same word elsewhere" lead="The same term in other contexts. Different definitions are expected; that is what bounded contexts are for.">
	{#if sameWord.length}
		<table>
			<thead><tr><th>Context</th><th>Definition</th></tr></thead>
			<tbody>
				{#each sameWord as x}
					<tr>
						<td><RefLink ref={x.boundedcontext.ref} label={x.boundedcontext.name} icon={ICONS.boundedcontext} /></td>
						<td><RefLink ref={x.ref} label={x.definition} /></td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<Empty text="Only this context uses the word." />
	{/if}
</Section>
