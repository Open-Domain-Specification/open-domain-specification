<script module lang="ts">
export const sections = [
	{ id: "constrains", label: "Constrains" },
	{ id: "guards", label: "Guarded by" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
import { Consumable, type Invariant } from "@open-domain-specification/core";
import { nameOf, problemsUnder, useModel } from "../model";
import { ownerCrumbs } from "../elements";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Definition from "../atoms/Definition.svelte";
import DefinitionList from "../atoms/DefinitionList.svelte";
import Lockup from "../atoms/Lockup.svelte";
import { kindOf } from "../molecules/element-kind";
import RefList from "../molecules/RefList.svelte";
import LanguageSection from "../organisms/LanguageSection.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";

/** One rule that must hold after every change, and the elements it is about. */
const { invariant: i }: { invariant: Invariant } = $props();
const model = useModel();
const a = $derived(i.aggregate);
// The elements the rule holds true of, and the operations that have to uphold
// it, are two different readings of the same list, so the page splits them by
// what each target is: a consumable is an operation the rule guards, anything
// else is something the rule is about.
const guarded = $derived(i.guarded);
const targets = $derived(i.targets.filter((t) => !(t instanceof Consumable)));
const columns: Column[] = [
	{ key: "name", label: "Element" },
	{ key: "description", label: "Description" },
];
</script>

<PageHeader description={i.description} crumbs={ownerCrumbs(model.workspace, a)}>
	{#snippet title()}<Lockup kind="invariant" name={i.name} id={i.id} detail="Invariant" size="title" />{/snippet}
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

<Section
	id="guards"
	title="Guarded by"
	lead="The operations this rule is about. A transition rule is enforced where the transition is made, so these are the ones that have to uphold it."
	count={guarded.length}
>
	<RefList items={guarded} kind="command" block empty="No operation names this rule; it is checked wherever the aggregate is saved." />
</Section>

<LanguageSection target={i} />
