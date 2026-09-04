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
	Service,
	Subdomain,
	type Team,
	ValueObject,
	Workspace,
} from "@open-domain-specification/core";
import { tick } from "svelte";
import { useModel } from "./model";
import Toc from "./organisms/Toc.svelte";
import { HEALTH_PAGE, resolvePage } from "./resolve";
import ConsumablePage, {
	sectionsFor as consumableSections,
} from "./templates/ConsumablePage.svelte";
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
import PolicyPage, {
	sections as policySections,
} from "./templates/PolicyPage.svelte";
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
import PageLayout from "./v2/PageLayout.svelte";
import V2AggregatePage, {
	sections as v2AggregateSections,
} from "./v2/templates/AggregatePage.svelte";
import V2ContextPage, {
	sections as v2ContextSections,
} from "./v2/templates/ContextPage.svelte";
import V2WorkspacePage, {
	sections as v2WorkspaceSections,
} from "./v2/templates/WorkspacePage.svelte";

/**
 * Renders the page that owns `ref` and scrolls to the element when the ref
 * points inside it.
 *
 * The workspace, bounded context and aggregate routes are drawn by the v2
 * templates in `v2/PageLayout`, which carries its own two-column grid and the
 * v2 table of contents. The thirteen pages still on v1 share one `.layout`
 * from `assets/page.css` and the v1 `Toc`; card 36 moves them across, and the
 * whole inner block goes with the last of them. The team page is the group's
 * final `{:else}`, as the workspace was before this card: `resolvePage` only
 * ever returns one of these, so nothing reaches an unhandled branch.
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
		<PageLayout sections={v2WorkspaceSections}><V2WorkspacePage /></PageLayout>
	{:else if target instanceof BoundedContext}
		<PageLayout sections={v2ContextSections}><V2ContextPage context={target} /></PageLayout>
	{:else if target instanceof Aggregate}
		<PageLayout sections={v2AggregateSections}><V2AggregatePage aggregate={target} /></PageLayout>
	{:else}
		<div class="layout">
			{#if target === HEALTH_PAGE}
				<main><HealthPage /></main><Toc sections={healthSections} />
			{:else if target instanceof Domain}
				<main><DomainPage domain={target} /></main><Toc sections={domainSections} />
			{:else if target instanceof Subdomain}
				<main><SubdomainPage subdomain={target} /></main><Toc sections={subdomainSections} />
			{:else if target instanceof Service}
				<main><ServicePage service={target} /></main><Toc sections={serviceSections} />
			{:else if target instanceof Entity}
				<main><EntityPage entity={target} /></main><Toc sections={entitySections} />
			{:else if target instanceof ValueObject}
				<main><ValueObjectPage valueobject={target} /></main><Toc sections={valueObjectSections} />
			{:else if target instanceof Invariant}
				<main><InvariantPage invariant={target} /></main><Toc sections={invariantSections} />
			{:else if target instanceof DataSchema}
				<main><SchemaPage schema={target} /></main><Toc sections={schemaSections} />
			{:else if target instanceof Policy}
				<main><PolicyPage policy={target} /></main><Toc sections={policySections} />
			{:else if target instanceof GlossaryTerm}
				<main><TermPage term={target} /></main><Toc sections={termSections} />
			{:else if target instanceof Consumable}
				<main><ConsumablePage consumable={target} /></main><Toc sections={consumableSections(target)} />
			{:else if target instanceof ContextRelationship}
				<main><RelationshipPage relationship={target} /></main><Toc sections={relationshipSections} />
			{:else}
				<main><TeamPage team={target as Team} /></main><Toc sections={teamSections} />
			{/if}
		</div>
	{/if}
{/key}
