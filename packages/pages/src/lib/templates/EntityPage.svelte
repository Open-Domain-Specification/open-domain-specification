<script module lang="ts">
export const sections = [
	{ id: "attributes", label: "Attributes" },
	{ id: "relations", label: "Relations" },
	{ id: "invariants", label: "Constrained by" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
	import { Entity } from "@open-domain-specification/core";
	import Chip from "../atoms/Chip.svelte";
	import Dim from "../atoms/Dim.svelte";
	import Empty from "../atoms/Empty.svelte";
	import RefLink from "../atoms/RefLink.svelte";
	import Card from "../molecules/Card.svelte";
	import Fact from "../molecules/Fact.svelte";
	import { ICONS, problemsUnder, useModel } from "../model";
	import AttributesSection from "../organisms/AttributesSection.svelte";
	import LanguageSection from "../organisms/LanguageSection.svelte";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";
	import { ownerCrumbs } from "./elements";

	let { entity: e }: { entity: Entity } = $props();
	const model = useModel();
	const ws = model.workspace;
	const a = $derived(e.aggregate);
	const incoming = $derived(
		[...a.entities.values(), ...a.valueobjects.values()]
			.flatMap((o) => o.relations)
			.filter((r) => r.target === e),
	);
	const invariants = $derived([...a.invariants.values()].filter((i) => i.targets.includes(e)));
	const identity = $derived([...e.attributes.values()].filter((x) => x.identity));
	const iconOf = (t: unknown) => (t instanceof Entity ? ICONS.entity : ICONS.valueobject);
</script>

<PageHeader kind="Entity" icon={ICONS.entity} name={e.name} id={e.id} description={e.description} crumbs={ownerCrumbs(ws, a)}>
	{#snippet meta()}
		{#if e.root}<Chip label="aggregate root" tone="core" title="Every change to the aggregate enters through the root, which enforces the invariants." />{/if}
	{/snippet}
	{#snippet facts()}
		<Fact label="Aggregate"><RefLink ref={a.ref} label={a.name} icon={ICONS.aggregate} /></Fact>
		<Fact label="Identity">
			{#each identity as x, i}{#if i}, {/if}<code>{x.name}</code>{:else}<Dim>no identity attribute marked</Dim>{/each}
		</Fact>
	{/snippet}
</PageHeader>

<AttributesSection attributes={e.attributes.values()} lead="An entity is known by its identity, not its attributes; the key marks what identifies it." />

<Section
	id="relations"
	title="Relations"
	lead="What this entity holds or points at, and what points back. References across aggregates carry identity only."
	problems={problemsUnder(model, e.ref)}
>
	{#if e.relations.length}
		<h3>Outgoing</h3>
		<ul class="relations">
			{#each e.relations as r}
				<li><Chip label={r.relation} tone="muted" /> <RefLink ref={r.target.ref} label={r.target.name} icon={iconOf(r.target)} />{#if r.cardinality} <Dim>{r.cardinality}</Dim>{/if}{#if r.label} <Dim>{r.label}</Dim>{/if}</li>
			{/each}
		</ul>
	{/if}
	{#if incoming.length}
		<h3>Incoming</h3>
		<ul class="relations">
			{#each incoming as r}
				<li><RefLink ref={r.source.ref} label={r.source.name} icon={iconOf(r.source)} /> <Chip label={r.relation} tone="muted" /> this{#if r.cardinality} <Dim>{r.cardinality}</Dim>{/if}</li>
			{/each}
		</ul>
	{/if}
	{#if !e.relations.length && !incoming.length}<Empty text="No relations." />{/if}
</Section>

<Section id="invariants" title="Constrained by" lead="Invariants that name this entity explicitly. The root enforces them on every change.">
	{#each invariants as i}
		<Card ref={i.ref} name={i.name} icon={ICONS.invariant} description={i.description} />
	{:else}
		<Empty text="No invariant names this entity." />
	{/each}
</Section>

<LanguageSection target={e} />
