<script module lang="ts">
import {
	BoundedContext as InvariantContext,
	invariantTimingLabel,
	type Invariant as Rule,
} from "@open-domain-specification/core";

/**
 * A context's rule is a check rather than something a save keeps true, so its
 * section says "Checked" where an aggregate's and a value's say "Guarded by".
 * A check is made on one side of the call or the other, and the heading says
 * which: "Checked before" for a precondition, "Checked after" for a
 * postcondition, plain "Checked by" where the rule sets neither flag, and
 * "Guaranteed on event" for an external event's payload (decisions 27–28).
 * The side nav shows the same heading the page does, so both read it here.
 */
const eventOnlyPostcondition = (i: Rule) =>
	i.postcondition &&
	i.guarded.length > 0 &&
	i.guarded.every((it) => it.type === "event");

export const guardsLabel = (i: Rule) => {
	if (!(i.owner instanceof InvariantContext)) return "Guarded by";
	return invariantTimingLabel(i);
};

export const sectionsFor = (i: Rule) => [
	{ id: "constrains", label: "Constrains" },
	{ id: "guards", label: guardsLabel(i) },
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

/** One rule and the elements it is about. Its owner and flags say when it holds. */
const { invariant: i }: { invariant: Invariant } = $props();
const model = useModel();
// A rule belongs to a value object, where it holds by construction, to one
// aggregate, where its flags distinguish call timing from an unflagged save
// rule, or to the whole context, where it is checked across instances or of
// an answer (decision 27).
// The header says which, because the three promise different things.
const owner = $derived(i.owner);
const inAggregate = $derived(owner instanceof Aggregate);
const inContext = $derived(owner instanceof BoundedContext);
const KIND = {
	value: {
		label: "value invariant",
		title:
			"Holds by construction of the value: one that breaks it is never made.",
		lead: "The attributes of this value the rule is about, including inherited attributes and those of values it composes. It reaches nothing outside that path.",
		guards:
			"Nothing guards a value's rule. It is kept by refusing to construct a value that breaks it, which is why no operation appears here.",
		empty:
			"No operation guards this rule, and none needs to: the value is never made without it.",
	},
	aggregate: {
		label: "aggregate invariant",
		title: "Holds inside the aggregate's boundary, every time it is saved.",
		lead: "The held model elements this rule is about, plus any named operation of this context that keeps it.",
		guards:
			"The operations this rule is about. Naming one says which operation keeps the rule, not that the rule stops holding after it: balanced postings are still balanced once the posting is made.",
		empty:
			"No operation names this rule; it is checked wherever the aggregate is saved.",
	},
	// A precondition and a postcondition are different promises from a rule
	// kept true afterwards, and the page says which — but it reads that from
	// the flag the invariant sets, never from the fact that an operation is
	// named (decision 27's second amendment).
	precondition: {
		label: "precondition",
		title:
			"Checked before the operations it names run, and not true again after them.",
		lead: "The elements this rule is about, all inside the boundary that states it.",
		guards:
			"The operations this rule is checked before. What it was checked against — a balance, an entitlement, another context's answer — may move on the moment the call returns, so nothing re-establishes it afterwards.",
		empty:
			"No operation names this rule, so nothing checks it: a precondition is checked before something runs, and the model has to say what.",
	},
	// The mirror of a precondition: not checked on the way in but guaranteed of
	// what comes back, which did not exist until the call ran (decision 19,
	// third amendment).
	postcondition: {
		label: "postcondition",
		title:
			"Guaranteed of what the operations it names answer with, every time they answer.",
		lead: "The elements this rule is about. A guarantee may relate the guarded call's request to its answer or refusal and to model elements of this boundary.",
		guards:
			"The operations this rule is a guarantee about. It describes what each call answers with, without claiming an aggregate keeps that answer true afterward.",
		empty:
			"No operation names this rule, so there is no answer for it to be about: a postcondition is a guarantee about what a call comes back with, and the model has to say which call.",
	},
	context: {
		label: "context invariant",
		title:
			"Checked across the instances and aggregates of the context, by an operation. Never a promise about afterwards.",
		lead: "The elements this rule is about. They may sit in any aggregate of the context, because no one instance can see the others.",
		guards:
			"The operations that check this rule. Nothing enforces a rule across instances as a side effect of being saved, and a check can race, so the model says where it is made rather than promising it holds afterwards.",
		empty:
			"No operation names this rule, so nothing checks it: a rule across instances is kept only by whoever checks it.",
	},
	// A context's rule is a check either way; the flags say which side of the
	// call the check is made on. A quotation service that stores nothing has no
	// aggregate to hold the contract of its own operation, so the context holds
	// it: the weight is checked before, the quote against the tariff after
	// (decision 27, third amendment).
	contextBefore: {
		label: "context invariant",
		title:
			"Checked before the operations it names run, across the instances and aggregates of the context. Never a promise about afterwards.",
		lead: "The elements this rule is about: model elements of the context, the guarded request, and facts already received by the guard or its front.",
		guards:
			"The operations this rule is checked before. What it was checked against may move on the moment the call returns, and a check across instances can race, so nothing re-establishes it afterwards.",
		empty:
			"No operation names this rule, so nothing checks it: a precondition is checked before something runs, and the model has to say what.",
	},
	contextAfter: {
		label: "context invariant",
		title:
			"Checked of what the operations it names answer with, against the instances and aggregates of the context. Never a promise about afterwards.",
		lead: "The elements this rule is about: anything in the context, and the fields of what the guarded call carries, request and answer alike.",
		guards:
			"The operations this rule is checked of. It describes what each call answers with, without claiming that answer remains true afterward.",
		empty:
			"No operation names this rule, so there is no answer for it to be about: a postcondition is checked of what a call comes back with, and the model has to say which call.",
	},
	contextEvent: {
		label: "context invariant",
		title: "Guaranteed of the event's payload whenever this external context sends it.",
		lead: "The fields of the event payload this external context guarantees.",
		guards: "The event whose payload carries this guarantee.",
		empty: "No event names this guarantee.",
	},
	contextMixed: {
		label: "context invariant",
		title: "Guaranteed of the named consumables' answers or payloads.",
		lead: "The fields this context guarantees of the named consumables.",
		guards: "The operations and events that carry this guarantee.",
		empty: "No consumable names this guarantee.",
	},
} as const;
// The elements the rule holds true of and the consumables responsible for it
// are two readings of the same list. The page separates them by target kind.
const guarded = $derived(i.guarded);
// Which of the three an invariant is, the invariant states: naming an
// operation says who keeps the rule, and `precondition` and `postcondition`
// say whether it is checked before one, guaranteed of its answer or an
// external event's payload, or still true after it. The two flags are
// exclusive (`postcondition-names-operation` for modelled contexts). A
// context's rule never promises to hold at rest (decisions 27–28).
const words = $derived(
	inContext
		? i.precondition
			? KIND.contextBefore
			: i.postcondition
				? eventOnlyPostcondition(i)
					? KIND.contextEvent
					: i.guarded.some((it) => it.type === "event")
						? KIND.contextMixed
						: KIND.contextAfter
				: KIND.context
		: KIND[
				i.precondition
					? "precondition"
					: i.postcondition
						? "postcondition"
						: i.kind
			],
);
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
	title={guardsLabel(i)}
	lead={words.guards}
	count={guarded.length}
>
	<RefList
		items={guarded}
		kind={inContext && eventOnlyPostcondition(i)
			? "event"
			: inContext && i.postcondition && guarded.some((it) => it.type === "event")
				? undefined
				: "command"}
		block
		empty={words.empty}
	/>
</Section>

<LanguageSection target={i} />
