<script module lang="ts">
export const sections = [
	{ id: "attributes", label: "Attributes" },
	{ id: "usage", label: "Used by" },
	{ id: "relations", label: "Relations" },
	{ id: "invariants", label: "Constrained by" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
import type { ValueObject } from "@open-domain-specification/core";
import { problemsUnder, useModel } from "../../model";
import {
	type AttributeOwner,
	ownerCrumbs,
	usagesOf,
} from "../../templates/elements";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Definition from "../Definition.svelte";
import DefinitionList from "../DefinitionList.svelte";
import Keyword from "../Keyword.svelte";
import Code from "../molecules/Code.svelte";
import Lockup from "../Lockup.svelte";
import AttributesSection from "../organisms/AttributesSection.svelte";
import { kindOf } from "../molecules/element-kind";
import InvariantsSection from "../organisms/InvariantsSection.svelte";
import LanguageSection from "../organisms/LanguageSection.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";

/** One value object: its attributes, everything typed by it, and what constrains it. */
const { valueobject: v }: { valueobject: ValueObject } = $props();
const model = useModel();
const ws = model.workspace;
const a = $derived(v.aggregate);
const usages = $derived(usagesOf(ws, v));
const invariants = $derived(
	[...a.invariants.values()].filter((i) => i.targets.includes(v)),
);
const ownerOf = (u: { owner: unknown }) => u.owner as AttributeOwner;

const usageColumns: Column[] = [
	{ key: "name", label: "Attribute" },
	{ key: "on", label: "On" },
	{ key: "in", label: "In" },
];
const relationColumns: Column[] = [
	{ key: "relation", label: "Relation" },
	{ key: "target", label: "Target" },
	{ key: "cardinality", label: "Cardinality" },
];
</script>

<PageHeader description={v.description} crumbs={ownerCrumbs(ws, a)}>
	{#snippet title()}<Lockup kind="valueobject" name={v.name} id={v.id} detail="Value object" size="title" />{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Aggregate"><Lockup kind="aggregate" name={a.name} ref={a.ref} /></Definition>
		</DefinitionList>
	{/snippet}
</PageHeader>

<AttributesSection
	attributes={v.attributes.values()}
	lead="A value object is its attributes. Two with the same values are the same thing; change one and you have a new one."
/>

<Section
	id="usage"
	title="Used as a type by"
	lead="Attributes across the workspace whose type is this value object."
	count={usages.length}
	problems={problemsUnder(model, v.ref)}
>
	<DataTable
		columns={usageColumns}
		rows={usages}
		empty="Nothing uses this value object as a type yet."
		rowId={(u) => u.ref}
	>
		{#snippet cell(u, col)}
			{@const owner = ownerOf(u)}
			{#if col.key === "name"}
				<Code text={u.name} />
			{:else if col.key === "on"}
				<Lockup kind={kindOf(owner)} name={owner.name} ref={owner.ref} />
			{:else if owner.aggregate}
				<Lockup kind="aggregate" name={owner.aggregate.name} ref={owner.aggregate.ref} />
			{:else if owner.boundedcontext}
				<Lockup kind="boundedcontext" name={owner.boundedcontext.name} ref={owner.boundedcontext.ref} />
			{/if}
		{/snippet}
	</DataTable>
</Section>

<Section
	id="relations"
	title="Relations"
	lead="Value objects may hold other value objects; they should not point at entities in other aggregates."
	count={v.relations.length}
>
	<DataTable columns={relationColumns} rows={v.relations} empty="No relations.">
		{#snippet cell(r, col)}
			{#if col.key === "relation"}
				<Keyword text={r.relation} />
			{:else if col.key === "target"}
				<Lockup kind={kindOf(r.target)} name={r.target.name} ref={r.target.ref} />
			{:else if r.cardinality}
				<Keyword text={r.cardinality} mono />
			{/if}
		{/snippet}
	</DataTable>
</Section>

<InvariantsSection
	{invariants}
	lead="Invariants that name this value object."
	emptyText="No invariant names this value object."
/>

<LanguageSection target={v} />
