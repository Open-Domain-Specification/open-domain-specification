<script module lang="ts">
export const sections = [
	{ id: "position", label: "Strategic position" },
	{ id: "model", label: "Model" },
	{ id: "invariants", label: "Invariants" },
	{ id: "values", label: "Value objects" },
	{ id: "integration", label: "Integration surface" },
	{ id: "reactions", label: "Reactions" },
	{ id: "schemas", label: "Schemas" },
	{ id: "language", label: "Ubiquitous language" },
];
</script>

<script lang="ts">
import {
	type Aggregate,
	Answer,
	type BoundedContext,
	ODSConsumableMap,
	ODSContextMap,
	ODSFlowMap,
	type ReactionTrigger,
	type ValueObject,
} from "@open-domain-specification/core";
import { valueObjectsOf } from "../elements";
import { consumableGraph, contextGraph, flowGraph } from "../flow/graph";
import { FLOW_MAP_EMPTY, flowMapCaption } from "../flow/flow-graph";
import {
	consumableIcon,
	ICONS,
	nameOf,
	problemsUnder,
	SERVICE_TYPE,
	SUBDOMAIN_TYPE,
	useModel,
} from "../model";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Definition from "../atoms/Definition.svelte";
import DefinitionList from "../atoms/DefinitionList.svelte";
import EmptyState from "../atoms/EmptyState.svelte";
import Heading from "../atoms/Heading.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import AttributeTable from "../molecules/AttributeTable.svelte";
import ConsumesTable from "../molecules/ConsumesTable.svelte";
import { EXTERNAL, MUD } from "../molecules/ContextLockup.svelte";
import { kindOf } from "../molecules/element-kind";
import Joined from "../molecules/Joined.svelte";
import ProvidesTable from "../molecules/ProvidesTable.svelte";
import TeamLockup from "../molecules/TeamLockup.svelte";
import DiagramFigure from "../organisms/DiagramFigure.svelte";
import InvariantsSection from "../organisms/InvariantsSection.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";
import StrategicPositionTable from "../organisms/StrategicPositionTable.svelte";
import Ref from "../atoms/Ref.svelte";

/**
 * One bounded context, the page a developer opens to see what a context owns,
 * what it publishes and what it depends on. The grids of cards v1 spent a
 * screen on become three tables: the `·`-joined counts line under each
 * aggregate is now numeric columns a reader can compare down, and the
 * schemas are level-3 subsections with their attribute table rather than
 * cards in a grid.
 */
const { context: bc }: { context: BoundedContext } = $props();
const model = useModel();
const ws = model.workspace;
const aggregates = $derived([...bc.aggregates.values()]);
const services = $derived([...bc.services.values()]);
const policies = $derived([...bc.policies.values()]);
const processes = $derived([...bc.processes.values()]);
const terms = $derived([...bc.glossary.values()]);
const schemas = $derived([...bc.schemas.values()]);
const valueobjects = $derived([...bc.valueobjects.values()]);
// The rules no single instance can keep: they belong to the context and each
// names the operation that checks it before acting (decision 27).
const invariants = $derived([...bc.invariants.values()]);
const members = $derived([...aggregates, ...services]);
const provides = $derived(members.flatMap((m) => [...m.consumables.values()]));
const consumes = $derived(members.flatMap((m) => m.consumptions));
const relationships = $derived(
	ws.relationships.filter((r) => r.source === bc || r.target === bc),
);
const contextMap = $derived(ODSContextMap.fromBoundedContext(bc));
const consumableMap = $derived(ODSConsumableMap.fromBoundedContext(bc));
const mapCaption = $derived(`${bc.name} context map`);
const flowMap = $derived(ODSFlowMap.fromBoundedContext(bc));
const consumableCaption = $derived(`${bc.name} consumable map`);
const flowCaption = $derived(flowMapCaption(bc.name));

const countOf = (kind: "operation" | "event", a: Aggregate) =>
	[...a.consumables.values()].filter((c) => c.type === kind).length;

/** The aggregates of this context that hold a value object. */
const holdersOf = (v: ValueObject) =>
	aggregates.filter((a) => valueObjectsOf(a).includes(v));

const aggregateColumns: Column[] = [
	{ key: "name", label: "Aggregate" },
	{ key: "root", label: "Root" },
	{ key: "entities", label: "Entities", numeric: true },
	{ key: "valueobjects", label: "Value objects", numeric: true },
	{ key: "invariants", label: "Invariants", numeric: true },
	{ key: "operations", label: "Operations", numeric: true },
	{ key: "events", label: "Events", numeric: true },
	{ key: "description", label: "Description" },
];
const valueObjectColumns: Column[] = [
	{ key: "name", label: "Value object" },
	{ key: "attributes", label: "Attributes", numeric: true },
	{ key: "heldby", label: "Held by" },
	{ key: "description", label: "Description" },
];
const serviceColumns: Column[] = [
	{ key: "name", label: "Service" },
	{ key: "type", label: "Kind" },
	{ key: "description", label: "Description" },
];
/**
 * What one cell of a reaction's row links to and says. An answer has no page
 * of its own, so it links to the shape it came back as and names the call it
 * came back from in the tooltip: two operations may answer with one shape, and
 * the row has to say which one this reaction waits on (decision 23).
 */
const triggerLink = (trigger: ReactionTrigger) =>
	trigger instanceof Answer
		? { ref: trigger.schema.ref, title: trigger.origin }
		: { ref: trigger.ref, title: undefined };
const policyColumns: Column[] = [
	{ key: "name", label: "Policy" },
	{ key: "when", label: "When" },
	{ key: "then", label: "Then" },
	{ key: "description", label: "Description" },
];
// The lifecycle in the order it runs, so a reader follows one instance
// across the row: what begins it, what it waits for, what it does, what
// finishes it.
const processColumns: Column[] = [
	{ key: "name", label: "Process" },
	{ key: "starts", label: "Starts" },
	{ key: "when", label: "While it runs" },
	{ key: "then", label: "Then" },
	{ key: "ends", label: "Ends" },
	{ key: "description", label: "Description" },
];
const termColumns: Column[] = [
	{ key: "name", label: "Term" },
	{ key: "definition", label: "Definition" },
	{ key: "aliases", label: "Also" },
	{ key: "embodied", label: "Embodied by" },
];
</script>

<PageHeader crumbs={[["#", ws.name]]} description={bc.description}>
	{#snippet title()}<Lockup kind="boundedcontext" name={bc.name} id={bc.id} detail="Bounded context" size="title" />{/snippet}
	{#snippet meta()}
		{#if bc.bigBallOfMud}<Keyword text={MUD.label} tone="warn" title={MUD.title} />{/if}
		{#if bc.external}<Keyword text={EXTERNAL.label} title={EXTERNAL.title} />{/if}
	{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Serves">
				<Joined>{#each [...bc.subdomains] as s (s.ref)}<span class="serves"><Lockup
								kind="subdomain"
								name={s.name}
								ref={s.ref}
							/> <Keyword text={s.type} title={SUBDOMAIN_TYPE[s.type]} /></span>{:else}<Keyword text="no subdomain" />{/each}</Joined>
			</Definition>
			<Definition term="Owned by">{#if bc.external}Nobody here; the enterprise integrates with it and does not run it{:else}<TeamLockup team={bc.team} />{/if}</Definition>
		</DefinitionList>
	{/snippet}
</PageHeader>

<Section
	id="position"
	title="Strategic position"
	lead="Who this context depends on and who depends on it. Roles say how each side protects its model."
	count={relationships.length}
	problems={problemsUnder(model, bc.ref).filter((d) => d.ref === bc.ref)}
>
	<StrategicPositionTable context={bc} />
	<DiagramFigure
		caption={mapCaption}
		emptyText="No neighbouring contexts yet."
		graph={contextGraph(contextMap, ws.relationships)}
	/>
</Section>

<Section
	id="model"
	title="Model"
	lead="Aggregates are the consistency boundaries; services carry behaviour that belongs to no single aggregate."
	count={members.length}
	problems={members.flatMap((m) => problemsUnder(model, m.ref))}
>
	<Heading level={3} count={aggregates.length}>Aggregates</Heading>
	<DataTable
		columns={aggregateColumns}
		rows={aggregates}
		rowId={(a) => a.ref}
		empty="No aggregates yet."
	>
		{#snippet cell(a, col)}
			{#if col.key === "name"}
				<Lockup kind="aggregate" name={a.name} ref={a.ref} />
			{:else if col.key === "root"}
				{@const root = [...a.entities.values()].find((e) => e.root)}
				{#if root}
					<Lockup kind="entity" name={root.name} ref={root.ref} />
				{:else}
					<Keyword text="no root" tone="warn" />
				{/if}
			{:else if col.key === "entities"}
				{a.entities.size}
			{:else if col.key === "valueobjects"}
				{valueObjectsOf(a).length}
			{:else if col.key === "invariants"}
				{a.invariants.size}
			{:else if col.key === "operations"}
				{countOf("operation", a)}
			{:else if col.key === "events"}
				{countOf("event", a)}
			{:else}
				{a.description}
			{/if}
		{/snippet}
	</DataTable>

	<Heading level={3} count={services.length}>Services</Heading>
	<DataTable
		columns={serviceColumns}
		rows={services}
		rowId={(s) => s.ref}
		empty="No services."
	>
		{#snippet cell(s, col)}
			{#if col.key === "name"}
				<Lockup kind="service" name={s.name} ref={s.ref} />
			{:else if col.key === "type"}
				<Keyword text={s.type} title={SERVICE_TYPE[s.type]} />
			{:else}
				{s.description}
			{/if}
		{/snippet}
	</DataTable>
</Section>

<InvariantsSection
	{invariants}
	id="invariants"
	title="Invariants"
	constrains
	lead="Rules that hold across this context's instances and aggregates: uniqueness, quotas, limits. No one instance can see the others, so each names the operation that checks it before acting."
	emptyText="No invariants across aggregates. Every rule here is one an aggregate keeps on its own."
	problems={invariants.flatMap((i) => problemsUnder(model, i.ref))}
/>

<Section
	id="values"
	title="Value objects"
	lead="The values this context defines once. Any of its aggregates may hold one, so a change to a value object is a change everywhere it is held."
	count={valueobjects.length}
	problems={valueobjects.flatMap((v) => problemsUnder(model, v.ref))}
>
	<DataTable
		columns={valueObjectColumns}
		rows={valueobjects}
		rowId={(v) => v.ref}
		empty="No value objects. Every attribute here is a bare type."
	>
		{#snippet cell(v, col)}
			{#if col.key === "name"}
				<Lockup kind="valueobject" name={v.name} ref={v.ref} />
			{:else if col.key === "attributes"}
				{v.attributes.size}
			{:else if col.key === "heldby"}
				<Joined>{#each holdersOf(v) as a (a.ref)}<Lockup kind="aggregate" name={a.name} ref={a.ref} />{:else}<Keyword text="nothing" tone="warn" />{/each}</Joined>
			{:else}
				{v.description}
			{/if}
		{/snippet}
	</DataTable>
</Section>

<Section
	id="integration"
	title="Integration surface"
	lead="What this context publishes and what it consumes. Events and open host operations are its published language."
	count={provides.length + consumes.length}
>
	<DiagramFigure
		caption={consumableCaption}
		emptyText="Provides and consumes nothing yet."
		graph={consumableGraph(consumableMap)}
	/>
	<Heading level={3} count={provides.length}>Provides</Heading>
	<ProvidesTable consumables={provides} />
	<Heading level={3} count={consumes.length}>Consumes</Heading>
	<ConsumesTable consumptions={consumes} />
</Section>

<Section
	id="reactions"
	title="Reactions"
	lead="What this context does when something happens. A policy acts the moment its events arrive; a process remembers which of its events have arrived and says what finishes it. Both are where cross-aggregate workflow lives."
	count={policies.length + processes.length}
	problems={[...policies, ...processes].flatMap((p) => problemsUnder(model, p.ref))}
>
	<Heading level={3} count={policies.length}>Policies</Heading>
	<DataTable columns={policyColumns} rows={policies} rowId={(p) => p.ref} empty="No policies.">
		{#snippet cell(p, col)}
			{#if col.key === "name"}
				<Lockup kind="policy" name={p.name} ref={p.ref} />
			{:else if col.key === "when"}
				<Joined>{#each p.events as e (e.ref)}{@const link = triggerLink(e)}<Ref ref={link.ref} title={link.title} label={e.name} icon={ICONS[kindOf(e)]} kind={kindOf(e)} />{:else}<Keyword text="nothing" />{/each}</Joined>
			{:else if col.key === "then"}
				<Joined>{#each p.commands as c (c.ref)}<Ref ref={c.ref} label={c.name} icon={ICONS.command} kind="command" />{:else}<Keyword text="nothing" />{/each}</Joined>
			{:else}
				{p.description}
			{/if}
		{/snippet}
	</DataTable>

	<Heading level={3} count={processes.length}>Processes</Heading>
	<DataTable columns={processColumns} rows={processes} rowId={(p) => p.ref} empty="No processes. Nothing here waits for more than one event before it acts.">
		{#snippet cell(p, col)}
			{#if col.key === "name"}
				<Lockup kind="process" name={p.name} ref={p.ref} />
			{:else if col.key === "starts"}
				<Joined>{#each p.startEvents as e (e.ref)}<Ref ref={e.ref} label={e.name} icon={ICONS.event} kind="event" />{:else}<Keyword text="nothing" tone="warn" />{/each}</Joined>
			{:else if col.key === "when"}
				<Joined>{#each p.events as e (e.ref)}{@const link = triggerLink(e)}<Ref ref={link.ref} title={link.title} label={e.name} icon={ICONS[kindOf(e)]} kind={kindOf(e)} />{:else}<Keyword text="nothing" />{/each}</Joined>
			{:else if col.key === "then"}
				<Joined>{#each p.commands as c (c.ref)}<Ref ref={c.ref} label={c.name} icon={ICONS.command} kind="command" />{:else}<Keyword text="nothing" />{/each}</Joined>
			{:else if col.key === "ends"}
				<Joined>{#each p.endEvents as e (e.ref)}{@const link = triggerLink(e)}<Ref ref={link.ref} title={link.title} label={e.name} icon={ICONS[kindOf(e)]} kind={kindOf(e)} />{:else}<Keyword text="nothing" tone="warn" />{/each}</Joined>
			{:else}
				{p.description}
			{/if}
		{/snippet}
	</DataTable>

	<!-- The map summarises both tables, so it comes under the pair: by here
	     every policy and process it draws has been named. -->
	<DiagramFigure
		caption={flowCaption}
		emptyText={FLOW_MAP_EMPTY}
		graph={flowGraph(flowMap)}
	/>
</Section>

<Section
	id="schemas"
	title="Schemas"
	lead="Payload shapes this context publishes or accepts. They are part of its published language, so a change here is a change for every consumer."
	count={schemas.length}
	problems={schemas.flatMap((s) => problemsUnder(model, s.ref))}
>
	{#each schemas as s (s.ref)}
		<Heading level={3} id={s.ref}>
			<Lockup kind="schema" name={s.name} ref={s.ref} />
			{#if s.consumables.length}
				<span class="carried">carried by</span>
				<Joined>{#each s.consumables as c (c.ref)}<Ref
							ref={c.ref}
							label={c.name}
							icon={consumableIcon(c)}
							kind={c.type === "event" ? "event" : "command"}
						/>{/each}</Joined>
			{:else}
				<Keyword text="unused" />
			{/if}
		</Heading>
		<p class="description">{s.description}</p>
		<AttributeTable attributes={s.attributes.values()} empty="The schema has no attributes." />
	{:else}
		<EmptyState text="No schemas. Consumables carry no declared payload." />
	{/each}
</Section>

<Section
	id="language"
	title="Ubiquitous language"
	lead="The words this context uses, with the model element that embodies each one. A term that maps to nothing is a gap; an element with no term is jargon."
	count={terms.length}
	problems={terms.flatMap((t) => problemsUnder(model, t.ref))}
>
	<DataTable
		columns={termColumns}
		rows={terms}
		rowId={(t) => t.ref}
		empty="No glossary yet. Naming things is the first act of modelling."
	>
		{#snippet cell(t, col)}
			{#if col.key === "name"}
				<Lockup kind="term" name={t.name} ref={t.ref} />
			{:else if col.key === "definition"}
				{t.definition}
			{:else if col.key === "aliases"}
				<Joined>{#each t.aliases as alias (alias)}<Keyword text={alias} />{:else}<Keyword text="–" />{/each}</Joined>
			{:else if t.embodiedBy}
				<Ref ref={t.embodiedBy.ref} label={nameOf(t.embodiedBy)} />
			{:else}
				<Keyword text="not modelled" />
			{/if}
		{/snippet}
	</DataTable>
</Section>

<style>
	.carried {
		color: var(--vscode-descriptionForeground);
	}
	/* A subdomain and its classification are one item in the list, so they
	   break together and take one separator between them. */
	.serves {
		white-space: nowrap;
	}
	.description {
		margin: 0 0 4px;
		max-width: 80ch;
		line-height: 1.5;
	}
</style>
