<script module lang="ts">
export const sections = [
	{ id: "constrains", label: "Constrains" },
	{ id: "guards", label: "Guarded by" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
import {
	Aggregate,
	BoundedContext,
	Consumable,
	type Invariant,
} from "@open-domain-specification/core";
import { nameOf, problemsUnder, useModel } from "../model";
import { ownerCrumbs } from "../elements";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import Definition from "../atoms/Definition.svelte";
import DefinitionList from "../atoms/DefinitionList.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import { contextCrumbs } from "../molecules/crumbs";
import { kindOf } from "../molecules/element-kind";
import RefList from "../molecules/RefList.svelte";
import LanguageSection from "../organisms/LanguageSection.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";

/** One rule that must hold after every change, and the elements it is about. */
const { invariant: i }: { invariant: Invariant } = $props();
const model = useModel();
// A rule belongs to a value object, where it holds by construction, to one
// aggregate, where it holds on every save, or to the whole context, where it
// holds across instances and something checks it before acting (decision 27).
// The header says which, because the three promise different things.
const owner = $derived(i.owner);
const inAggregate = $derived(owner instanceof Aggregate);
const inContext = $derived(owner instanceof BoundedContext);
const KIND = {
	value: {
		label: "value invariant",
		title:
			"Holds by construction of the value: one that breaks it is never made.",
		lead: "The attributes of this value the rule is about. A value knows nothing outside itself, so the list goes no further.",
		guards:
			"Nothing guards a value's rule. It is kept by refusing to construct a value that breaks it, which is why no operation appears here.",
		empty:
			"No operation guards this rule, and none needs to: the value is never made without it.",
	},
	aggregate: {
		label: "aggregate invariant",
		title: "Holds inside the aggregate's boundary, every time it is saved.",
		lead: "The elements this rule is about, all inside the aggregate that is saved as one.",
		guards:
			"The operations this rule is about. A transition rule is enforced where the transition is made, so these are the ones that have to uphold it.",
		empty:
			"No operation names this rule; it is checked wherever the aggregate is saved.",
	},
	context: {
		label: "context invariant",
		title:
			"Holds across the instances and aggregates of the context; an operation checks it before acting.",
		lead: "The elements this rule is about. They may sit in any aggregate of the context, because no one instance can see the others.",
		guards:
			"The operations this rule is about. Nothing enforces a rule across instances as a side effect, so it holds only because these check it before acting.",
		empty:
			"No operation names this rule, so nothing keeps it: a rule across instances needs a guard.",
	},
} as const;
const words = $derived(KIND[i.kind]);
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

<PageHeader
	description={i.description}
	crumbs={owner instanceof BoundedContext
		? contextCrumbs(model.workspace, owner)
		: ownerCrumbs(model.workspace, owner)}
>
	{#snippet title()}<Lockup kind="invariant" name={i.name} id={i.id} detail="Invariant" size="title" />{/snippet}
	{#snippet meta()}
		<Keyword text={words.label} title={words.title} />
	{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Enforced by">
				{#if inAggregate}
					<Lockup kind="aggregate" name={owner.name} ref={owner.ref} />
				{:else if inContext}
					<Lockup kind="boundedcontext" name={owner.name} ref={owner.ref} />
				{:else}
					<Lockup kind="valueobject" name={owner.name} ref={owner.ref} />
				{/if}
			</Definition>
		</DefinitionList>
	{/snippet}
</PageHeader>

<Section
	id="constrains"
	title="Constrains"
	lead={words.lead}
	count={targets.length}
	problems={problemsUnder(model, i.ref)}
>
	<DataTable
		{columns}
		rows={targets}
		empty={inAggregate
			? "Applies to the aggregate as a whole."
			: inContext
				? "Applies to the context as a whole."
				: "Applies to the value as a whole."}
		rowId={(t) => t.ref}
	>
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
	lead={words.guards}
	count={guarded.length}
>
	<RefList items={guarded} kind="command" block empty={words.empty} />
</Section>

<LanguageSection target={i} />
