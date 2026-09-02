<script module lang="ts">
export const sections = [
	{ id: "attributes", label: "Attributes" },
	{ id: "carriers", label: "Carried by" },
	{ id: "language", label: "Language" },
];
</script>

<script lang="ts">
	import type { DataSchema } from "@open-domain-specification/core";
	import Empty from "../atoms/Empty.svelte";
	import RefLink from "../atoms/RefLink.svelte";
	import ConsumableChips from "../molecules/ConsumableChips.svelte";
	import Fact from "../molecules/Fact.svelte";
	import { consumableIcon, ICONS, problemsUnder, useModel } from "../model";
	import AttributesSection from "../organisms/AttributesSection.svelte";
	import LanguageSection from "../organisms/LanguageSection.svelte";
	import PageHeader from "../organisms/PageHeader.svelte";
	import Section from "../organisms/Section.svelte";

	let { schema: s }: { schema: DataSchema } = $props();
	const model = useModel();
	const ws = model.workspace;
	const bc = $derived(s.boundedcontext);
	const carriers = $derived(s.consumables);
	const crumbs = $derived<[string, string][]>([["#", ws.name], [bc.ref, bc.name]]);
</script>

<PageHeader kind="Schema" icon={ICONS.schema} name={s.name} id={s.id} description={s.description} {crumbs}>
	{#snippet facts()}
		<Fact label="Published by"><RefLink ref={bc.ref} label={bc.name} icon={ICONS.boundedcontext} /></Fact>
	{/snippet}
</PageHeader>

<AttributesSection attributes={s.attributes.values()} lead="The shape a consumable carries. Consumers depend on every attribute here, so removing one is a breaking change." />

<Section
	id="carriers"
	title="Carried by"
	lead="Consumables that use this schema as their payload. A command and the event it raises often share one."
	problems={problemsUnder(model, s.ref)}
>
	{#if carriers.length}
		<table>
			<thead><tr><th>Consumable</th><th>Kind</th><th>Provider</th></tr></thead>
			<tbody>
				{#each carriers as c}
					<tr>
						<td><RefLink ref={c.ref} label={c.name} icon={consumableIcon(c)} /></td>
						<td><ConsumableChips consumable={c} /></td>
						<td><RefLink ref={c.provider.ref} label={c.provider.name} /></td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<Empty text="Nothing carries this schema yet." />
	{/if}
</Section>

<LanguageSection target={s} />
