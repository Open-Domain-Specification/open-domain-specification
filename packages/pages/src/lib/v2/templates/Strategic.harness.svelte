<script module lang="ts">
import ContextPage, { sections as contextSections } from "./ContextPage.svelte";
import DomainPage, { sections as domainSections } from "./DomainPage.svelte";
import HealthPage, { sections as healthSections } from "./HealthPage.svelte";
import RelationshipPage, {
	sections as relationshipSections,
} from "./RelationshipPage.svelte";
import SubdomainPage, {
	sections as subdomainSections,
} from "./SubdomainPage.svelte";
import TeamPage, { sections as teamSections } from "./TeamPage.svelte";
import WorkspacePage, {
	sections as workspaceSections,
} from "./WorkspacePage.svelte";

/** Which page a `V2/...` story draws. */
export type PageName =
	| "workspace"
	| "domain"
	| "subdomain"
	| "context"
	| "relationship"
	| "team"
	| "health";

/** The table of contents a page carries, for the layout around it. */
export const sectionsOf = (page: PageName) =>
	({
		workspace: workspaceSections,
		domain: domainSections,
		subdomain: subdomainSections,
		context: contextSections,
		relationship: relationshipSections,
		team: teamSections,
		health: healthSections,
	})[page];
</script>

<script lang="ts">
import type { Workspace } from "@open-domain-specification/core";
import {
	pickContext,
	pickDomain,
	pickRelationship,
	pickSubdomain,
	pickTeam,
} from "./picks.harness";

/**
 * One v2 page against the petstore, picked by name: the story harness and the
 * compare harness draw the same page from here, so the two columns of a
 * comparison can never drift apart. The caller supplies the model context and
 * the theme around it.
 */
const { page, ws }: { page: PageName; ws: Workspace } = $props();
</script>

{#if page === "workspace"}
	<WorkspacePage />
{:else if page === "domain"}
	<DomainPage domain={pickDomain(ws)} />
{:else if page === "subdomain"}
	<SubdomainPage subdomain={pickSubdomain(ws)} />
{:else if page === "context"}
	<ContextPage context={pickContext(ws)} />
{:else if page === "relationship"}
	<RelationshipPage relationship={pickRelationship(ws)} />
{:else if page === "team"}
	<TeamPage team={pickTeam(ws)} />
{:else}
	<HealthPage />
{/if}
