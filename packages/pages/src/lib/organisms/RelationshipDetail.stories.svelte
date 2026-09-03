<script module lang="ts">
import type { ContextRelationship } from "@open-domain-specification/core";
import { defineMeta } from "@storybook/addon-svelte-csf";
import Theme from "../evidence/Theme.harness.svelte";
import { petstoreModel } from "../fixtures";
import ModelProvider from "../ModelProvider.svelte";
import RelationshipDetail from "./RelationshipDetail.svelte";

const model = petstoreModel();
const of = (type: string) =>
	model.workspace.relationships.find(
		(r) => r.type === type,
	) as ContextRelationship;

/** One relationship per state the petstore records. */
const byDesign = of("customer-supplier"); // Catalog → Sales, two comments
const tolerated = of("upstream-downstream"); // Sales → Inventory, one comment
const refactor = of("shared-kernel"); // Catalog ↔ Inventory, says what it should become
const silent = of("partnership"); // Sales ↔ Fulfilment, nothing written at all

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({
	title: "Organisms/RelationshipDetail",
	component: RelationshipDetail,
	parameters: { layout: "padded" },
});
</script>

<Story name="By design">
	{#snippet template()}
		<ModelProvider {model}><RelationshipDetail relationship={byDesign} /></ModelProvider>
	{/snippet}
</Story>

<Story name="Tolerated">
	{#snippet template()}
		<ModelProvider {model}><RelationshipDetail relationship={tolerated} /></ModelProvider>
	{/snippet}
</Story>

<!-- Symmetric: no side chips, and the pattern is stated once above both contexts. -->
<Story name="Refactor">
	{#snippet template()}
		<ModelProvider {model}><RelationshipDetail relationship={refactor} /></ModelProvider>
	{/snippet}
</Story>

<Story name="No comments at all">
	{#snippet template()}
		<ModelProvider {model}><RelationshipDetail relationship={silent} /></ModelProvider>
	{/snippet}
</Story>

<!-- Standalone: the same block is what a relationship page renders, with an h1. -->
<Story name="Standalone page">
	{#snippet template()}
		<ModelProvider {model}>
			<RelationshipDetail relationship={refactor} heading="h1" />
		</ModelProvider>
	{/snippet}
</Story>

<Story name="Refactor, light">
	{#snippet template()}
		<Theme mode="light">
			<ModelProvider {model}><RelationshipDetail relationship={refactor} /></ModelProvider>
		</Theme>
	{/snippet}
</Story>

<Story name="Refactor, dark">
	{#snippet template()}
		<Theme mode="dark">
			<ModelProvider {model}><RelationshipDetail relationship={refactor} /></ModelProvider>
		</Theme>
	{/snippet}
</Story>
