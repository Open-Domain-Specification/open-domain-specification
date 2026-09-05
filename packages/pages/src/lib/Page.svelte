<script lang="ts">
import {
	Aggregate,
	BoundedContext,
	Consumable,
	ContextRelationship,
	DataSchema,
	Domain,
	Entity,
	GlossaryTerm,
	Invariant,
	Policy,
	Process,
	Service,
	Subdomain,
	type Team,
	ValueObject,
	Workspace,
} from "@open-domain-specification/core";
import { tick } from "svelte";
import { useModel } from "./model";
import { HEALTH_PAGE, resolvePage } from "./resolve";
import AggregatePage, {
	sections as aggregateSections,
} from "./templates/AggregatePage.svelte";
import ConsumablePage, {
	sectionsFor as consumableSections,
} from "./templates/ConsumablePage.svelte";
import ContextPage, {
	sections as contextSections,
} from "./templates/ContextPage.svelte";
import DomainPage, {
	sections as domainSections,
} from "./templates/DomainPage.svelte";
import EntityPage, {
	sections as entitySections,
} from "./templates/EntityPage.svelte";
import HealthPage, {
	sections as healthSections,
} from "./templates/HealthPage.svelte";
import InvariantPage, {
	sections as invariantSections,
} from "./templates/InvariantPage.svelte";
import PageLayout from "./templates/PageLayout.svelte";
import PolicyPage, {
	sections as policySections,
} from "./templates/PolicyPage.svelte";
import ProcessPage, {
	sections as processSections,
} from "./templates/ProcessPage.svelte";
import RelationshipPage, {
	sections as relationshipSections,
} from "./templates/RelationshipPage.svelte";
import SchemaPage, {
	sections as schemaSections,
} from "./templates/SchemaPage.svelte";
import ServicePage, {
	sections as serviceSections,
} from "./templates/ServicePage.svelte";
import SubdomainPage, {
	sections as subdomainSections,
} from "./templates/SubdomainPage.svelte";
import TeamPage, {
	sections as teamSections,
} from "./templates/TeamPage.svelte";
import TermPage, {
	sections as termSections,
} from "./templates/TermPage.svelte";
import ValueObjectPage, {
	sections as valueObjectSections,
} from "./templates/ValueObjectPage.svelte";
import WorkspacePage, {
	sections as workspaceSections,
} from "./templates/WorkspacePage.svelte";

/**
 * Renders the page that owns `ref` and scrolls to the element when the ref
 * points inside it.
 *
 * Every route is one template inside `PageLayout`, which carries the two
 * columns and the table of contents. The team page is the group's final
 * `{:else}`: `resolvePage` only ever returns one of these, so nothing reaches
 * an unhandled branch.
 */
let { ref }: { ref: string } = $props();
const model = useModel();
const page = $derived(resolvePage(model.workspace, ref));
const target = $derived(page.target);
const anchor = $derived(ref !== page.pageRef ? ref : undefined);

$effect(() => {
	const id = anchor;
	if (!id) return;
	tick().then(() => {
		const el = document.getElementById(id);
		if (el) {
			el.scrollIntoView({ block: "center" });
			el.classList.add("flash");
		}
	});
});
</script>

{#key page.pageRef}
	{#if target instanceof Workspace}
		<PageLayout sections={workspaceSections}><WorkspacePage /></PageLayout>
	{:else if target instanceof BoundedContext}
		<PageLayout sections={contextSections}><ContextPage context={target} /></PageLayout>
	{:else if target instanceof Aggregate}
		<PageLayout sections={aggregateSections}><AggregatePage aggregate={target} /></PageLayout>
	{:else if target === HEALTH_PAGE}
		<PageLayout sections={healthSections}><HealthPage /></PageLayout>
	{:else if target instanceof Domain}
		<PageLayout sections={domainSections}><DomainPage domain={target} /></PageLayout>
	{:else if target instanceof Subdomain}
		<PageLayout sections={subdomainSections}><SubdomainPage subdomain={target} /></PageLayout>
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
	{:else if target instanceof Process}
		<PageLayout sections={processSections}><ProcessPage process={target} /></PageLayout>
	{:else if target instanceof GlossaryTerm}
		<PageLayout sections={termSections}><TermPage term={target} /></PageLayout>
	{:else if target instanceof Consumable}
		<PageLayout sections={consumableSections(target)}><ConsumablePage consumable={target} /></PageLayout>
	{:else if target instanceof ContextRelationship}
		<PageLayout sections={relationshipSections}><RelationshipPage relationship={target} /></PageLayout>
	{:else}
		<PageLayout sections={teamSections}><TeamPage team={target as Team} /></PageLayout>
	{/if}
{/key}
