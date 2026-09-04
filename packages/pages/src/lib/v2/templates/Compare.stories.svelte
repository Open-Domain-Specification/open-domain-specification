<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Compare from "./Compare.harness.svelte";

/**
 * One story per template, each drawing the shipped v1 page and its v2
 * successor side by side against the same petstore element, for the morning
 * review. The v1 column is the page exactly as it ships.
 */
const { Story } = defineMeta({
	title: "V2/Compare",
	component: Compare,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="WorkspacePage">
	{#snippet template()}<Compare page="workspace" />{/snippet}
</Story>

<Story name="DomainPage">
	{#snippet template()}<Compare page="domain" />{/snippet}
</Story>

<Story name="SubdomainPage">
	{#snippet template()}<Compare page="subdomain" />{/snippet}
</Story>

<Story name="ContextPage">
	{#snippet template()}<Compare page="context" />{/snippet}
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
