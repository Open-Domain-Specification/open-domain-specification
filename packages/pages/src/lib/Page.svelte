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
	Team,
	ValueObject,
} from "@open-domain-specification/core";
import { tick } from "svelte";
import { useModel } from "./model";
import Toc from "./organisms/Toc.svelte";
import { resolvePage } from "./resolve";
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
import WorkspacePage, {
	sections as workspaceSections,
} from "./templates/WorkspacePage.svelte";

/** Renders the page that owns `ref` and scrolls to the element when the ref points inside it. */
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

<div class="layout">
	{#key page.pageRef}
		{#if target instanceof Domain}
			<main><DomainPage domain={target} /></main><Toc sections={domainSections} />
		{:else if target instanceof Subdomain}
			<main><SubdomainPage subdomain={target} /></main><Toc sections={subdomainSections} />
		{:else if target instanceof BoundedContext}
			<main><ContextPage context={target} /></main><Toc sections={contextSections} />
		{:else if target instanceof Aggregate}
			<main><AggregatePage aggregate={target} /></main><Toc sections={aggregateSections} />
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
		{:else if target instanceof Team}
			<main><TeamPage team={target} /></main><Toc sections={teamSections} />
		{:else}
			<main><WorkspacePage /></main><Toc sections={workspaceSections} />
		{/if}
	{/key}
</div>
