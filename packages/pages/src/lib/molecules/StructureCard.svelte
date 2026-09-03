<script lang="ts">
import type { Entity, ValueObject } from "@open-domain-specification/core";
import Chip from "../atoms/Chip.svelte";
import Dim from "../atoms/Dim.svelte";
import RefLink from "../atoms/RefLink.svelte";
import { ICONS } from "../model";
import AttributeTable from "./AttributeTable.svelte";
import Card from "./Card.svelte";

/** An entity or value object inside an aggregate: attributes and relations; the root is highlighted. */
let {
	element: e,
	kind,
}: { element: Entity | ValueObject; kind: "entity" | "valueobject" } = $props();
const isRoot = $derived(kind === "entity" && (e as Entity).root);
</script>

<Card ref={e.ref} name={e.name} icon={ICONS[kind]} description={e.description} highlight={isRoot}>
	{#snippet meta()}
		{#if isRoot}<Chip label="aggregate root" tone="core" title="Every change to the aggregate enters through the root." />{/if}
	{/snippet}
	<AttributeTable attributes={e.attributes.values()} />
	{#if e.relations.length}
		<ul class="relations">
			{#each e.relations as r}
				<li>{r.relation} <RefLink ref={r.target.ref} label={r.target.name} />{#if r.cardinality} <Dim>{r.cardinality}</Dim>{/if}{#if r.label} <Dim>{r.label}</Dim>{/if}</li>
			{/each}
		</ul>
	{/if}
</Card>
