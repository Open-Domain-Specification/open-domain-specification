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
	import Chip from "../atoms/Chip.svelte";
	import Dim from "../atoms/Dim.svelte";
	import Empty from "../atoms/Empty.svelte";
	import RefLink from "../atoms/RefLink.svelte";
	import Card from "../molecules/Card.svelte";
	import Fact from "../molecules/Fact.svelte";
	import { ICONS, problemsUnder, useModel } from "../model";
	import AttributesSection from "../organisms/AttributesSection.svelte";
	import InvariantsSection from "../organisms/InvariantsSection.svelte";
	import LanguageSection from "../organisms/LanguageSection.svelte";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";
	import { type AttributeOwner, ownerCrumbs, usagesOf } from "./elements";

	let { valueobject: v }: { valueobject: ValueObject } = $props();
	const model = useModel();
	const ws = model.workspace;
	const a = $derived(v.aggregate);
	const usages = $derived(usagesOf(ws, v));
	const invariants = $derived([...a.invariants.values()].filter((i) => i.targets.includes(v)));
	const ownerOf = (u: { owner: unknown }) => u.owner as AttributeOwner;
</script>

<PageHeader kind="Value Object" icon={ICONS.valueobject} name={v.name} id={v.id} description={v.description} crumbs={ownerCrumbs(ws, a)}>
	{#snippet facts()}
		<Fact label="Aggregate"><RefLink ref={a.ref} label={a.name} icon={ICONS.aggregate} /></Fact>
	{/snippet}
</PageHeader>

<AttributesSection attributes={v.attributes.values()} lead="A value object is its attributes. Two with the same values are the same thing; change one and you have a new one." />

<Section id="usage" title="Used as a type by" lead="Attributes across the workspace whose type is this value object." problems={problemsUnder(model, v.ref)}>
	{#if usages.length}
		<table>
			<thead><tr><th>Attribute</th><th>On</th><th>In</th></tr></thead>
			<tbody>
				{#each usages as u}
					{@const owner = ownerOf(u)}
					<tr>
						<td><code>{u.name}</code></td>
						<td><RefLink ref={owner.ref} label={owner.name} /></td>
						<td>
							{#if owner.aggregate}<RefLink ref={owner.aggregate.ref} label={owner.aggregate.name} icon={ICONS.aggregate} />{:else if owner.boundedcontext}<RefLink ref={owner.boundedcontext.ref} label={owner.boundedcontext.name} icon={ICONS.boundedcontext} />{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<Empty text="Nothing uses this value object as a type yet." />
	{/if}
</Section>

<Section id="relations" title="Relations" lead="Value objects may hold other value objects; they should not point at entities in other aggregates.">
	{#if v.relations.length}
		<ul class="relations">
			{#each v.relations as r}
				<li><Chip label={r.relation} tone="muted" /> <RefLink ref={r.target.ref} label={r.target.name} />{#if r.cardinality} <Dim>{r.cardinality}</Dim>{/if}</li>
			{/each}
		</ul>
	{:else}
		<Empty text="No relations." />
	{/if}
</Section>

<InvariantsSection {invariants} lead="Invariants that name this value object." emptyText="No invariant names this value object." />

<LanguageSection target={v} />
