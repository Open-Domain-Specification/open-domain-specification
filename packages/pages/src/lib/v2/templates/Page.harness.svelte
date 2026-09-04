<script lang="ts">
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
import ModelProvider from "../../ModelProvider.svelte";
import type { Model } from "../../model";
import { resolvePage } from "../../resolve";
import PageLayout from "../PageLayout.svelte";
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

/**
 * Renders the v2 tactical page that owns `ref`, inside the v2 page layout.
 * The nine tactical templates only; a ref this card does not cover renders
 * nothing, so a story that names one fails loudly in the Storybook e2e run
 * rather than quietly drawing a strategic page.
 */
const { model, ref }: { model: Model; ref: string } = $props();
const target = $derived(resolvePage(model.workspace, ref).target);
</script>

<ModelProvider {model}>
	{#if target instanceof Aggregate}
		<PageLayout sections={aggregateSections}><AggregatePage aggregate={target} /></PageLayout>
	{:else if target instanceof Service}
		<PageLayout sections={serviceSections}><ServicePage service={target} /></PageLayout>
	{:else if target instanceof Entity}
		<PageLayout sections={entitySections}><EntityPage entity={target} /></PageLayout>
	{:else if target instanceof ValueObject}
		<PageLayout sections={valueObjectSections}><ValueObjectPage valueobject={target} /></PageLayout>
	{:else if target instanceof Invariant}
		<PageLayout sections={invariantSections}><InvariantPage invariant={target} /></PageLayout>
	{:else if target instanceof DataSchema}
		<PageLayout sections={schemaSections}><SchemaPage schema={target} /></PageLayout>
	{:else if target instanceof Policy}
		<PageLayout sections={policySections}><PolicyPage policy={target} /></PageLayout>
	{:else if target instanceof GlossaryTerm}
		<PageLayout sections={termSections}><TermPage term={target} /></PageLayout>
	{:else if target instanceof Consumable}
		<PageLayout sections={consumableSections(target)}><ConsumablePage consumable={target} /></PageLayout>
	{/if}
</ModelProvider>
