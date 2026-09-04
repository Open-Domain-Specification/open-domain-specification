<script module lang="ts">
export const sections = [
	{ id: "attributes", label: "Attributes" },
	{ id: "relations", label: "Relations" },
	{ id: "invariants", label: "Constrained by" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
import type { Entity } from "@open-domain-specification/core";
import { problemsUnder, useModel } from "../model";
import { ownerCrumbs } from "../elements";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Definition from "../atoms/Definition.svelte";
import DefinitionList from "../atoms/DefinitionList.svelte";
import Heading from "../atoms/Heading.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Code from "../molecules/Code.svelte";
import Lockup from "../atoms/Lockup.svelte";
import AttributesSection from "../organisms/AttributesSection.svelte";
import { kindOf } from "../molecules/element-kind";
import InvariantsSection from "../organisms/InvariantsSection.svelte";
import LanguageSection from "../organisms/LanguageSection.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";

/** One entity: what identifies it, what it holds, what points back and what constrains it. */
const { entity: e }: { entity: Entity } = $props();
const model = useModel();
const a = $derived(e.aggregate);
// Value objects belong to the context, so what may point at an entity is
// every entity of the aggregate and every value object of the context.
const incoming = $derived(
	[...a.entities.values(), ...e.boundedcontext.valueobjects.values()]
		.flatMap((o) => o.relations)
		.filter((r) => r.target === e),
);
const invariants = $derived(
	[...a.invariants.values()].filter((i) => i.targets.includes(e)),
);
const identity = $derived([...e.attributes.values()].filter((x) => x.identity));

const outgoingColumns: Column[] = [
	{ key: "relation", label: "Relation" },
	{ key: "target", label: "Target" },
	{ key: "cardinality", label: "Cardinality" },
	{ key: "label", label: "Label" },
];
const incomingColumns: Column[] = [
	{ key: "source", label: "Source" },
	{ key: "relation", label: "Relation" },
	{ key: "cardinality", label: "Cardinality" },
	{ key: "label", label: "Label" },
];
</script>

<PageHeader description={e.description} crumbs={ownerCrumbs(model.workspace, a)}>
	{#snippet title()}<Lockup kind="entity" name={e.name} id={e.id} detail="Entity" size="title" />{/snippet}
	{#snippet meta()}
		{#if e.root}<Keyword
				text="aggregate root"
				title="Every change to the aggregate enters through the root, which enforces the invariants."
			/>{/if}
	{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Aggregate"><Lockup kind="aggregate" name={a.name} ref={a.ref} /></Definition>
			<Definition term="Identity">
				{#each identity as x, i (x.ref)}{#if i}, {/if}<Code text={x.name} />{:else}<Keyword text="no identity attribute marked" />{/each}
			</Definition>
		</DefinitionList>
	{/snippet}
</PageHeader>

<AttributesSection
	attributes={e.attributes.values()}
	lead="An entity is known by its identity, not its attributes; the key marks what identifies it."
/>

<Section
	id="relations"
	title="Relations"
	lead="What this entity holds or points at, and what points back. References across aggregates carry identity only."
	count={e.relations.length + incoming.length}
	problems={problemsUnder(model, e.ref)}
>
	<Heading level={3} count={e.relations.length}>Outgoing</Heading>
	<DataTable columns={outgoingColumns} rows={e.relations} empty="Points at nothing.">
		{#snippet cell(r, col)}
			{#if col.key === "relation"}
				<Keyword text={r.relation} />
			{:else if col.key === "target"}
				<Lockup kind={kindOf(r.target)} name={r.target.name} ref={r.target.ref} />
			{:else if col.key === "cardinality"}
				{#if r.cardinality}<Keyword text={r.cardinality} mono />{/if}
			{:else if r.label}
				<Keyword text={r.label} mono />
			{/if}
		{/snippet}
	</DataTable>
	<Heading level={3} count={incoming.length}>Incoming</Heading>
	<DataTable columns={incomingColumns} rows={incoming} empty="Nothing points at this entity.">
		{#snippet cell(r, col)}
			{#if col.key === "source"}
				<Lockup kind={kindOf(r.source)} name={r.source.name} ref={r.source.ref} />
			{:else if col.key === "relation"}
				<Keyword text={r.relation} />
			{:else if col.key === "cardinality"}
				{#if r.cardinality}<Keyword text={r.cardinality} mono />{/if}
			{:else if r.label}
				<Keyword text={r.label} mono />
			{/if}
		{/snippet}
	</DataTable>
</Section>

<InvariantsSection
	{invariants}
	lead="Invariants that name this entity explicitly. The root enforces them on every change."
	emptyText="No invariant names this entity."
/>

<LanguageSection target={e} />
