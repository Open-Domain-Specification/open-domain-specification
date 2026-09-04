<script module lang="ts">
export const sections = [
	{ id: "embodied", label: "Embodied by" },
	{ id: "elsewhere", label: "Elsewhere" },
];
</script>

<script lang="ts">
import type { GlossaryTerm } from "@open-domain-specification/core";
import { problemsUnder, useModel } from "../../model";
import { termsOf } from "../../templates/elements";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Definition from "../Definition.svelte";
import DefinitionList from "../DefinitionList.svelte";
import EmptyState from "../EmptyState.svelte";
import Keyword from "../Keyword.svelte";
import Lockup from "../Lockup.svelte";
import { contextCrumbs } from "../molecules/crumbs";
import { kindOf } from "../molecules/element-kind";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";
import Ref from "../Ref.svelte";

/** One word of the ubiquitous language: what it means here, what carries it, and who else uses it. */
const { term: t }: { term: GlossaryTerm } = $props();
const model = useModel();
const ws = model.workspace;
const bc = $derived(t.boundedcontext);
const embodied = $derived(
	t.embodiedBy as
		| { ref: string; name?: string; description?: string }
		| undefined,
);
const sameWord = $derived(
	[...termsOf(ws)].filter(
		(x) => x !== t && x.name.toLowerCase() === t.name.toLowerCase(),
	),
);
const crumbs = $derived(contextCrumbs(ws, bc));
const columns: Column[] = [
	{ key: "context", label: "Context" },
	{ key: "definition", label: "Definition" },
];
</script>

<PageHeader
	kind="term"
	kindLabel="Glossary term"
	name={t.name}
	id={t.id}
	description={t.definition}
	{crumbs}
>
	{#snippet keywords()}
		{#each t.aliases as a (a)}<Keyword text={a} title="alias" />{/each}
	{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Language of"><Lockup kind="boundedcontext" name={bc.name} ref={bc.ref} /></Definition>
		</DefinitionList>
	{/snippet}
</PageHeader>

<Section
	id="embodied"
	title="Embodied by"
	lead="The model element that carries this meaning. Language and model should say the same thing."
	problems={problemsUnder(model, t.ref)}
>
	{#if embodied}
		<p class="embodied"><Lockup kind={kindOf(embodied)} name={embodied.name ?? embodied.ref} ref={embodied.ref} /> <span class="description">{embodied.description ?? ""}</span></p>
	{:else}
		<EmptyState text="Not modelled. Either the word is not needed, or the model is missing something." />
	{/if}
</Section>

<Section
	id="elsewhere"
	title="Same word elsewhere"
	lead="The same term in other contexts. Different definitions are expected; that is what bounded contexts are for."
	count={sameWord.length}
>
	<DataTable {columns} rows={sameWord} empty="Only this context uses the word." rowId={(x) => x.ref}>
		{#snippet cell(x, col)}
			{#if col.key === "context"}
				<Lockup kind="boundedcontext" name={x.boundedcontext.name} ref={x.boundedcontext.ref} />
			{:else}
				<Ref ref={x.ref} label={x.definition} />
			{/if}
		{/snippet}
	</DataTable>
</Section>

<style>
	.embodied {
		margin: 0;
		padding: 0 8px;
		line-height: 22px;
		max-width: 80ch;
	}
	.description {
		margin-left: 8px;
	}
</style>
