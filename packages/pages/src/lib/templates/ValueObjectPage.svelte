<script module lang="ts">
export const sections = [
	{ id: "attributes", label: "Attributes" },
	{ id: "usage", label: "Used as a type by" },
	{ id: "relations", label: "Relations" },
	{ id: "invariants", label: "Invariants" },
	{ id: "constrained-by", label: "Constrained by" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
import type { ValueObject } from "@open-domain-specification/core";
import { problemsUnder, useModel } from "../model";
import { type AttributeOwner, usagesOf } from "../elements";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Definition from "../atoms/Definition.svelte";
import DefinitionList from "../atoms/DefinitionList.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Code from "../molecules/Code.svelte";
import { contextCrumbs } from "../molecules/crumbs";
import Lockup from "../atoms/Lockup.svelte";
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
// A value object belongs to the context, so any aggregate of that context may
// hold it and any of their invariants may name it (decision 16).
const bc = $derived(v.boundedcontext);
// A kind of a value object may live in a context that borrows this one over a
// shared kernel, so the kinds are looked up across the workspace, not here.
const kinds = $derived(v.kinds);
const usages = $derived(usagesOf(ws, v));
// The value's own rules, which hold by construction, and separately the rules
// of the aggregates that hold one, which name this value as part of a wider
// statement (decision 27).
const invariants = $derived([...v.invariants.values()]);
const constrainedBy = $derived(
	[...bc.aggregates.values()]
		.flatMap((a) => [...a.invariants.values()])
		.filter((i) => i.targets.includes(v)),
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

<PageHeader description={v.description} crumbs={contextCrumbs(ws, bc)}>
	{#snippet title()}<Lockup kind="valueobject" name={v.name} id={v.id} detail="Value object" size="title" />{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Context"><Lockup kind="boundedcontext" name={bc.name} ref={bc.ref} /></Definition>
			{#if v.specialises}
				<Definition term="A kind of">
					<Lockup kind="valueobject" name={v.specialises.name} ref={v.specialises.ref} />
				</Definition>
			{/if}
			{#if kinds.length}
				<Definition term="Kinds">
					{#each kinds as k, i (k.ref)}{#if i}, {/if}<Lockup kind="valueobject" name={k.name} ref={k.ref} />{/each}
				</Definition>
			{/if}
		</DefinitionList>
	{/snippet}
</PageHeader>

<AttributesSection
	attributes={v.attributes.values()}
	inherited={v.inheritedAttributes}
	lead="A value object is its attributes. Two with the same values are the same thing; change one and you have a new one."
/>

<Section
	id="usage"
	title={sections.find((s) => s.id === "usage")!.label}
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
	lead="Value objects may hold other value objects of the same context; they should not point at entities in other aggregates."
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
	title="Invariants"
	{invariants}
	constrains
	lead="Rules this value keeps by being constructed at all: one that breaks them is never made, so nothing guards them."
	emptyText="This value keeps no rule of its own."
/>

<InvariantsSection
	id="constrained-by"
	title="Constrained by"
	invariants={constrainedBy}
	lead="Rules of the aggregates that hold this value, which name it as part of a wider statement."
	emptyText="No aggregate's rule names this value object."
/>

<LanguageSection target={v} />
