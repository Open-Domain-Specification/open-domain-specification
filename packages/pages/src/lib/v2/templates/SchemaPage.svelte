<script module lang="ts">
export const sections = [
	{ id: "attributes", label: "Attributes" },
	{ id: "carriers", label: "Carried by" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
import type { DataSchema } from "@open-domain-specification/core";
import { problemsUnder, useModel } from "../../model";
import type { Column } from "../DataTable.svelte";
import DataTable from "../DataTable.svelte";
import Definition from "../Definition.svelte";
import DefinitionList from "../DefinitionList.svelte";
import Lockup from "../Lockup.svelte";
import AttributesSection from "../organisms/AttributesSection.svelte";
import ConsumableKeywords from "../molecules/ConsumableKeywords.svelte";
import { contextCrumbs } from "../molecules/crumbs";
import { kindOf } from "../molecules/element-kind";
import LanguageSection from "../organisms/LanguageSection.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";

/** One payload shape, and every consumable that carries it. */
const { schema: s }: { schema: DataSchema } = $props();
const model = useModel();
const bc = $derived(s.boundedcontext);
const carriers = $derived(s.consumables);
const crumbs = $derived(contextCrumbs(model.workspace, bc));
const columns: Column[] = [
	{ key: "name", label: "Consumable", sortable: true },
	{ key: "kind", label: "Kind" },
	{ key: "provider", label: "Provider" },
];
</script>

<PageHeader description={s.description} {crumbs}>
	{#snippet title()}<Lockup kind="schema" name={s.name} id={s.id} detail="Schema" size="title" />{/snippet}
	{#snippet facts()}
		<DefinitionList>
			<Definition term="Published by"><Lockup kind="boundedcontext" name={bc.name} ref={bc.ref} /></Definition>
		</DefinitionList>
	{/snippet}
</PageHeader>

<AttributesSection
	attributes={s.attributes.values()}
	lead="The shape a consumable carries. Consumers depend on every attribute here, so removing one is a breaking change."
/>

<Section
	id="carriers"
	title="Carried by"
	lead="Consumables that use this schema as their payload. A command and the event it raises often share one."
	count={carriers.length}
	problems={problemsUnder(model, s.ref)}
>
	<DataTable {columns} rows={carriers} empty="Nothing carries this schema yet." rowId={(c) => c.ref}>
		{#snippet cell(c, col)}
			{#if col.key === "name"}
				<Lockup kind={kindOf(c)} name={c.name} ref={c.ref} />
			{:else if col.key === "kind"}
				<ConsumableKeywords consumable={c} />
			{:else}
				<Lockup kind={kindOf(c.provider)} name={c.provider.name} ref={c.provider.ref} />
			{/if}
		{/snippet}
	</DataTable>
</Section>

<LanguageSection target={s} />
