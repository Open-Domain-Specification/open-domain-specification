<script module lang="ts">
export const sections = [
	{ id: "when", label: "When" },
	{ id: "then", label: "Then" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
import type { Consumable, Policy } from "@open-domain-specification/core";
import { problemsUnder, useModel } from "../../model";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Definition from "../Definition.svelte";
import DefinitionList from "../DefinitionList.svelte";
import Lockup from "../Lockup.svelte";
import ConsumableKeywords from "../molecules/ConsumableKeywords.svelte";
import { contextCrumbs } from "../molecules/crumbs";
import { kindOf } from "../molecules/element-kind";
import LanguageSection from "../organisms/LanguageSection.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";

/** Whenever X happens, do Y: the events that trigger a policy and the operations it issues. */
const { policy: p }: { policy: Policy } = $props();
const model = useModel();
const bc = $derived(p.boundedcontext);
const crumbs = $derived(contextCrumbs(model.workspace, bc));

/** The "When" table lists events, which are all of one kind; only "Then" needs the kind column. */
const columnsFor = (label: string, withKind: boolean): Column[] => [
	{ key: "name", label },
	...(withKind ? [{ key: "kind", label: "Kind" }] : []),
	{ key: "provider", label: "Provider" },
	{ key: "context", label: "Context" },
	{ key: "description", label: "Description" },
];
</script>

{#snippet consumables(rows: Consumable[], label: string, withKind: boolean, empty: string)}
	<DataTable columns={columnsFor(label, withKind)} {rows} {empty} rowId={(c) => c.ref}>
		{#snippet cell(c, col)}
			{#if col.key === "name"}
				<Lockup kind={kindOf(c)} name={c.name} ref={c.ref} />
			{:else if col.key === "kind"}
				<ConsumableKeywords consumable={c} />
			{:else if col.key === "provider"}
				<Lockup kind={kindOf(c.provider)} name={c.provider.name} ref={c.provider.ref} />
			{:else if col.key === "context"}
				<Lockup kind="boundedcontext" name={c.boundedcontext.name} ref={c.boundedcontext.ref} />
			{:else}
				{c.description}
			{/if}
		{/snippet}
	</DataTable>
{/snippet}

<PageHeader description={p.description} {crumbs}>
	{#snippet title()}<Lockup kind="policy" name={p.name} id={p.id} detail="Policy" size="title" />{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Lives in"><Lockup kind="boundedcontext" name={bc.name} ref={bc.ref} /></Definition>
		</DefinitionList>
	{/snippet}
</PageHeader>

<Section
	id="when"
	title="When"
	lead="The events that trigger this policy. Events from other contexts arrive through a consumption."
	count={p.events.length}
	problems={problemsUnder(model, p.ref)}
>
	{@render consumables(p.events, "Event", false, "Triggered by nothing.")}
</Section>

<Section id="then" title="Then" lead="The operations the policy issues. Whenever X happens, do Y." count={p.commands.length}>
	{@render consumables(p.commands, "Operation", true, "Issues nothing.")}
</Section>

<LanguageSection target={p} />
