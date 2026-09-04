<script module lang="ts">
export const sections = [
	{ id: "constrains", label: "Constrains" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
import type { Invariant } from "@open-domain-specification/core";
import { nameOf, problemsUnder, useModel } from "../../model";
import { ownerCrumbs } from "../../templates/elements";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Definition from "../Definition.svelte";
import DefinitionList from "../DefinitionList.svelte";
import Lockup from "../Lockup.svelte";
import { kindOf } from "../molecules/element-kind";
import LanguageSection from "../organisms/LanguageSection.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";

/** One rule that must hold after every change, and the elements it is about. */
const { invariant: i }: { invariant: Invariant } = $props();
const model = useModel();
const a = $derived(i.aggregate);
const targets = $derived(i.targets);
const columns: Column[] = [
	{ key: "name", label: "Element" },
	{ key: "description", label: "Description" },
];
</script>

<PageHeader
	kind="invariant"
	kindLabel="Invariant"
	name={i.name}
	id={i.id}
	description={i.description}
	crumbs={ownerCrumbs(model.workspace, a)}
>
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Enforced by"><Lockup kind="aggregate" name={a.name} ref={a.ref} /></Definition>
		</DefinitionList>
	{/snippet}
</PageHeader>

<Section
	id="constrains"
	title="Constrains"
	lead="The elements this rule is about. An invariant that spans aggregates cannot be guaranteed in one transaction."
	count={targets.length}
	problems={problemsUnder(model, i.ref)}
>
	<DataTable {columns} rows={targets} empty="Applies to the aggregate as a whole." rowId={(t) => t.ref}>
		{#snippet cell(t, col)}
			{#if col.key === "name"}
				<Lockup kind={kindOf(t)} name={nameOf(t)} ref={t.ref} />
			{:else}
				{t.description}
			{/if}
		{/snippet}
	</DataTable>
</Section>

<LanguageSection target={i} />
