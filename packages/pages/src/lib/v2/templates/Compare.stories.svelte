<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Compare from "./Compare.harness.svelte";

/**
 * One story per template still on v1, each drawing the shipped page and its
 * v2 successor side by side against the same petstore element, for the
 * morning review. The v1 column is the page exactly as it ships, so a page
 * that has already been migrated — the workspace, the bounded context and the
 * aggregate — has no story here.
 */
const { Story } = defineMeta({
	title: "V2/Compare",
	component: Compare,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="DomainPage">
	{#snippet template()}<Compare page="domain" />{/snippet}
</Story>

<Story name="SubdomainPage">
	{#snippet template()}<Compare page="subdomain" />{/snippet}
</Story>

<Story name="RelationshipPage">
	{#snippet template()}<Compare page="relationship" />{/snippet}
</Story>

<Story name="TeamPage">
	{#snippet template()}<Compare page="team" />{/snippet}
</Story>

<Story name="HealthPage">
	{#snippet template()}<Compare page="health" />{/snippet}
</Story>
