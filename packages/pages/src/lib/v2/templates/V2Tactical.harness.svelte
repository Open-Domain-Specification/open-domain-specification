<script module lang="ts">
import {
	Aggregate,
	Consumable,
	DataSchema,
	Entity,
	GlossaryTerm,
	Invariant,
	Policy,
	Service,
	ValueObject,
} from "@open-domain-specification/core";
import AggregatePage, {
	sections as aggregateSections,
} from "./AggregatePage.svelte";
import ConsumablePage, {
	sectionsFor as consumableSections,
} from "./ConsumablePage.svelte";
import EntityPage, { sections as entitySections } from "./EntityPage.svelte";
import InvariantPage, {
	sections as invariantSections,
} from "./InvariantPage.svelte";
import PolicyPage, { sections as policySections } from "./PolicyPage.svelte";
import SchemaPage, { sections as schemaSections } from "./SchemaPage.svelte";
import ServicePage, { sections as serviceSections } from "./ServicePage.svelte";
import TermPage, { sections as termSections } from "./TermPage.svelte";
import ValueObjectPage, {
	sections as valueObjectSections,
} from "./ValueObjectPage.svelte";

/** The table of contents the page for `target` carries, for the layout around it. */
export const tacticalSections = (
	target: unknown,
): { id: string; label: string }[] => {
	if (target instanceof Aggregate) return aggregateSections;
	if (target instanceof Service) return serviceSections;
	if (target instanceof Entity) return entitySections;
	if (target instanceof ValueObject) return valueObjectSections;
	if (target instanceof Invariant) return invariantSections;
	if (target instanceof DataSchema) return schemaSections;
	if (target instanceof Policy) return policySections;
	if (target instanceof GlossaryTerm) return termSections;
	if (target instanceof Consumable) return consumableSections(target);
	return [];
};
</script>

<script lang="ts">
/**
 * The v2 tactical page for one element, and nothing around it: no model
 * provider, no layout and no table of contents, so the story harness can put
 * it in the page layout and the compare harness can put it in a bare column.
 * The nine tactical templates only; an element this card does not cover
 * renders nothing, so a story that names one fails loudly in the Storybook
 * e2e run rather than quietly drawing a strategic page.
 */
const { target }: { target: unknown } = $props();
</script>

{#if target instanceof Aggregate}
	<AggregatePage aggregate={target} />
{:else if target instanceof Service}
	<ServicePage service={target} />
{:else if target instanceof Entity}
	<EntityPage entity={target} />
{:else if target instanceof ValueObject}
	<ValueObjectPage valueobject={target} />
{:else if target instanceof Invariant}
	<InvariantPage invariant={target} />
{:else if target instanceof DataSchema}
	<SchemaPage schema={target} />
{:else if target instanceof Policy}
	<PolicyPage policy={target} />
{:else if target instanceof GlossaryTerm}
	<TermPage term={target} />
{:else if target instanceof Consumable}
	<ConsumablePage consumable={target} />
{/if}
