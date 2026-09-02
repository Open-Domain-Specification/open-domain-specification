<script module lang="ts">
export const sections = [
	{ id: "position", label: "Strategic position" },
	{ id: "model", label: "Model" },
	{ id: "integration", label: "Integration surface" },
	{ id: "behaviour", label: "Policies" },
	{ id: "schemas", label: "Schemas" },
	{ id: "language", label: "Ubiquitous language" },
];
</script>

<script lang="ts">
	import {
		type BoundedContext,
		ODSConsumableMap,
		ODSContextMap,
	} from "@open-domain-specification/core";
	import {
		consumableMapToDigraph,
		contextMapToDigraph,
	} from "@open-domain-specification/graphviz";
	import Chip from "../atoms/Chip.svelte";
	import Dim from "../atoms/Dim.svelte";
	import Empty from "../atoms/Empty.svelte";
	import Icon from "../atoms/Icon.svelte";
	import RefLink from "../atoms/RefLink.svelte";
	import AttributeTable from "../molecules/AttributeTable.svelte";
	import Card from "../molecules/Card.svelte";
	import ConsumesTable from "../molecules/ConsumesTable.svelte";
	import ContextPill from "../molecules/ContextPill.svelte";
	import Fact from "../molecules/Fact.svelte";
	import Grid from "../molecules/Grid.svelte";
	import ProvidesTable from "../molecules/ProvidesTable.svelte";
	import RefList from "../molecules/RefList.svelte";
	import TeamLine from "../molecules/TeamLine.svelte";
	import {
		consumableIcon,
		ICONS,
		nameOf,
		problemsUnder,
		RELATIONSHIP,
		SERVICE_TYPE,
		useModel,
	} from "../model";
	import DiagramFigure from "../organisms/DiagramFigure.svelte";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";

	let { context: bc }: { context: BoundedContext } = $props();
	const model = useModel();
	const ws = model.workspace;
	const relationships = $derived(ws.relationships.filter((r) => r.source === bc || r.target === bc));
	const aggregates = $derived([...bc.aggregates.values()]);
	const services = $derived([...bc.services.values()]);
	const policies = $derived([...bc.policies.values()]);
	const terms = $derived([...bc.glossary.values()]);
	const schemas = $derived([...bc.schemas.values()]);
	const members = $derived([...aggregates, ...services]);
	const provides = $derived(members.flatMap((m) => [...m.consumables.values()]));
	const consumes = $derived(members.flatMap((m) => m.consumptions));
	const contextMap = $derived(ODSContextMap.fromBoundedContext(bc));
	const consumableMap = $derived(ODSConsumableMap.fromBoundedContext(bc));

	const symmetric = (type: string) => type === "partnership" || type === "shared-kernel" || type === "separate-ways";
	const directionOf = (r: (typeof relationships)[number]) =>
		symmetric(r.type) ? "with" : r.source === bc ? "upstream of" : "downstream of";
	const count = (kind: "operation" | "event", a: (typeof aggregates)[number]) =>
		[...a.consumables.values()].filter((c) => c.type === kind).length;
</script>

<PageHeader
	kind="Bounded Context"
	icon={ICONS.boundedcontext}
	name={bc.name}
	id={bc.id}
	description={bc.description}
	crumbs={[["#", ws.name]]}
>
	{#snippet meta()}
		{#if bc.bigBallOfMud}
			<Chip label="big ball of mud" tone="warn" title="A model that is not coherent; neighbours should protect themselves with an anti-corruption layer." />
		{/if}
	{/snippet}
	{#snippet facts()}
		<Fact label="Serves">
			{#each [...bc.subdomains] as s, i}{#if i}{" "}{/if}<RefLink ref={s.ref} label={s.name} icon={ICONS.subdomain} /> <Chip label={s.type} tone={s.type} />{:else}<Dim>no subdomain</Dim>{/each}
		</Fact>
		<Fact label="Owned by"><TeamLine team={bc.team} /></Fact>
	{/snippet}
</PageHeader>

<Section
	id="position"
	title="Strategic position"
	lead="Who this context depends on and who depends on it. Roles say how each side protects its model."
	problems={problemsUnder(model, bc.ref).filter((d) => d.ref === bc.ref)}
>
	{#if relationships.length}
		<table>
			<thead><tr><th>Relationship</th><th>With</th><th>Type</th><th>Upstream role</th><th>Downstream role</th></tr></thead>
			<tbody>
				{#each relationships as r}
					<tr>
						<td>{directionOf(r)}</td>
						<td><ContextPill context={r.source === bc ? r.target : r.source} /></td>
						<td><Chip label={r.type} tone="muted" title={RELATIONSHIP[r.type]} /></td>
						<td>{#each r.upstreamRoles as x, i}{#if i}{" "}{/if}<Chip label={x} tone="muted" />{/each}</td>
						<td>{#each r.downstreamRoles as x, i}{#if i}{" "}{/if}<Chip label={x} tone="muted" />{/each}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<Empty text="No explicit relationships. Consumptions below imply upstream and downstream links." />
	{/if}
	<DiagramFigure
		caption="{bc.name} context map"
		dot={contextMapToDigraph(contextMap).toDot()}
		nodeCount={contextMap.nodes.size}
		emptyText="No neighbouring contexts yet."
	/>
</Section>

<Section
	id="model"
	title="Model"
	lead="Aggregates are the consistency boundaries; services carry behaviour that belongs to no single aggregate."
	problems={members.flatMap((m) => problemsUnder(model, m.ref))}
>
	<h3>Aggregates</h3>
	{#if aggregates.length}
		<Grid>
			{#each aggregates as a}
				{@const root = [...a.entities.values()].find((e) => e.root)}
				<Card ref={a.ref} name={a.name} icon={ICONS.aggregate} description={a.description}>
					{#snippet meta()}
						{#if root}<Icon name="key" /> {root.name}{:else}<Chip label="no root" tone="warn" />{/if}
					{/snippet}
					<p class="counts">{a.entities.size} entities · {a.valueobjects.size} value objects · {a.invariants.size} invariants · {count("operation", a)} operations · {count("event", a)} events</p>
				</Card>
			{/each}
		</Grid>
	{:else}
		<Empty text="No aggregates yet." />
	{/if}
	{#if services.length}
		<h3>Services</h3>
		<Grid>
			{#each services as s}
				<Card ref={s.ref} name={s.name} icon={ICONS.service} description={s.description}>
					{#snippet meta()}<Chip label={s.type} tone="muted" title={SERVICE_TYPE[s.type]} />{/snippet}
				</Card>
			{/each}
		</Grid>
	{/if}
</Section>

<Section
	id="integration"
	title="Integration surface"
	lead="What this context publishes and what it consumes. Events and open host operations are its published language."
>
	<DiagramFigure
		caption="{bc.name} consumable map"
		dot={consumableMapToDigraph(consumableMap).toDot()}
		nodeCount={consumableMap.nodes.size}
		emptyText="Provides and consumes nothing yet."
	/>
	<h3>Provides</h3>
	<ProvidesTable consumables={provides} />
	<h3>Consumes</h3>
	<ConsumesTable consumptions={consumes} />
</Section>

<Section
	id="behaviour"
	title="Policies"
	lead="Reactions: when these events happen, issue these operations. Policies are where cross-aggregate workflow lives."
	problems={policies.flatMap((p) => problemsUnder(model, p.ref))}
>
	{#each policies as p}
		<Card ref={p.ref} name={p.name} icon={ICONS.policy} description={p.description}>
			<div class="policy">
				<Dim>when</Dim> <RefList items={p.events} icon={ICONS.event} empty="nothing" />
				<Dim>then</Dim> <RefList items={p.commands} icon={ICONS.command} empty="nothing" />
			</div>
		</Card>
	{:else}
		<Empty text="No policies." />
	{/each}
</Section>

<Section
	id="schemas"
	title="Schemas"
	lead="Payload shapes this context publishes or accepts. They are part of its published language, so a change here is a change for every consumer."
	problems={schemas.flatMap((s) => problemsUnder(model, s.ref))}
>
	{#if schemas.length}
		<Grid wide>
			{#each schemas as s}
				<Card ref={s.ref} name={s.name} icon={ICONS.schema} description={s.description}>
					{#snippet meta()}
						{#if s.consumables.length}
							<Dim>carried by</Dim> {#each s.consumables as c, i}{#if i}, {/if}<RefLink ref={c.ref} label={c.name} icon={consumableIcon(c)} />{/each}
						{:else}
							<Chip label="unused" tone="muted" />
						{/if}
					{/snippet}
					<AttributeTable attributes={s.attributes.values()} />
				</Card>
			{/each}
		</Grid>
	{:else}
		<Empty text="No schemas. Consumables carry no declared payload." />
	{/if}
</Section>

<Section
	id="language"
	title="Ubiquitous language"
	lead="The words this context uses, with the model element that embodies each one. A term that maps to nothing is a gap; an element with no term is jargon."
	problems={terms.flatMap((t) => problemsUnder(model, t.ref))}
>
	{#if terms.length}
		<table>
			<thead><tr><th>Term</th><th>Definition</th><th>Also</th><th>Embodied by</th></tr></thead>
			<tbody>
				{#each terms as t}
					<tr id={t.ref}>
						<td><strong>{t.name}</strong></td>
						<td>{t.definition}</td>
						<td class="dim">{t.aliases.join(", ")}</td>
						<td>{#if t.embodiedBy}<RefLink ref={t.embodiedBy.ref} label={nameOf(t.embodiedBy)} />{:else}<Dim>not modelled</Dim>{/if}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<Empty text="No glossary yet. Naming things is the first act of modelling." />
	{/if}
</Section>
