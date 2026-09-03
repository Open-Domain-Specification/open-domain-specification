<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ModelProvider from "../ModelProvider.svelte";
import Harness from "./DispositionMap.harness.svelte";
import { petstoreEvidence } from "./fixtures";
import Theme from "./Theme.harness.svelte";

const { model, sheets } = petstoreEvidence();

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({
	title: "Evidence/Context map with dispositions",
	component: Harness,
	parameters: { layout: "fullscreen" },
});
</script>

<!--
	Hover a role badge for the one-line pattern summary and the first comment;
	click it to open the relationship detail anchored to the badge. The card
	lives inside the flow viewport, so it pans and zooms with the map.
	Catalog–Inventory is marked refactor (warning badge) and Sales→Inventory
	tolerated (outlined badge); everything else is by design and unmarked.
-->
<Story name="Petstore">
	{#snippet template()}
		<ModelProvider {model}><Harness {sheets} /></ModelProvider>
	{/snippet}
</Story>

<Story name="Light">
	{#snippet template()}
		<Theme mode="light"><ModelProvider {model}><Harness {sheets} /></ModelProvider></Theme>
	{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}
		<Theme mode="dark"><ModelProvider {model}><Harness {sheets} /></ModelProvider></Theme>
	{/snippet}
</Story>
