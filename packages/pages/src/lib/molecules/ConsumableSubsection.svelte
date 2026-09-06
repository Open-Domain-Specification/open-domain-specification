<script lang="ts">
import type { Consumable } from "@open-domain-specification/core";
import Definition from "../atoms/Definition.svelte";
import DefinitionList from "../atoms/DefinitionList.svelte";
import Heading from "../atoms/Heading.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import AttributeTable from "./AttributeTable.svelte";
import ConsumableKeywords from "./ConsumableKeywords.svelte";
import { kindOf } from "./element-kind";
import RefList from "./RefList.svelte";

/**
 * One operation or event where the aggregate that provides it lists it: the
 * lockup and its keywords as the heading, the description, then the facts a
 * reader needs before opening the consumable's own page — what it carries,
 * what it answers with and what it refuses with when it is an operation that
 * says, what it produces or what produces it, and who consumes it — and the
 * payload itself. The rejection shapes are named here and drawn in full on the
 * consumable's own page, the same way the returned one is. v1 spent a card and
 * a `·`-joined meta line on the same thing.
 */
const {
	consumable: c,
	raisedBy = [],
}: { consumable: Consumable; raisedBy?: Consumable[] } = $props();
</script>

<div class="subsection">
	<Heading level={3} id={c.ref}>
		<Lockup kind={kindOf(c)} name={c.name} ref={c.ref} />
		<ConsumableKeywords consumable={c} />
	</Heading>
	{#if c.description}<p class="description">{c.description}</p>{/if}
	<DefinitionList>
		<Definition term={c.schemaMany ? "Payload, many" : "Payload"}>
			{#if c.schema}<Lockup kind="schema" name={c.schema.name} ref={c.schema.ref} />{:else}<Keyword text="no schema" />{/if}
		</Definition>
		{#if c.returns}
			<Definition term={c.returnsMany ? "Returns many" : "Returns"}><Lockup kind="schema" name={c.returns.name} ref={c.returns.ref} /></Definition>
		{/if}
		{#if c.rejects.length}
			<Definition term="Rejects with"><RefList items={c.rejects} kind="schema" /></Definition>
		{/if}
		{#if c.type === "event"}
			<Definition term="Raised by">
				<RefList items={raisedBy} kind="command" empty="nothing raises it" />
			</Definition>
		{:else}
			<Definition term="Raises">
				<RefList items={c.raisedEvents} kind="event" empty="nothing" />
			</Definition>
		{/if}
		<Definition term="Consumed by">
			{#if c.internal}
				<Keyword text="internal" />
			{:else}
				<RefList items={c.consumptions.map((x) => x.consumer)} empty="nobody yet" />
			{/if}
		</Definition>
	</DefinitionList>
	{#if c.schema}<AttributeTable attributes={c.schema.attributes.values()} empty="The schema has no attributes." />{/if}
</div>

<style>
	.subsection {
		margin-bottom: 16px;
	}
	.description {
		margin: 0 0 4px;
		padding: 0 8px;
		max-width: 80ch;
		line-height: 1.5;
	}
</style>
