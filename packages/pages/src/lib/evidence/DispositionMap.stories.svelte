<script module lang="ts">
import { ODSContextMap } from "@open-domain-specification/core";
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import { contextGraph } from "../flow/graph";
import ModelProvider from "../ModelProvider.svelte";
import InteractiveDiagram from "../organisms/InteractiveDiagram.svelte";
import Theme from "./Theme.harness.svelte";

const model = petstoreModel();
const graph = contextGraph(
	ODSContextMap.fromWorkspace(model.workspace),
	model.workspace.relationships,
);

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({
	title: "Evidence/Context map with dispositions",
	component: InteractiveDiagram,
	parameters: { layout: "fullscreen" },
});
</script>

<!--
	The shipped map, drawn from the workspace's own relationships. Hover a badge
	for the one-line pattern summary and the first comment; click it to open the
	relationship detail anchored to the badge. The card lives inside the flow
	viewport, so it pans and zooms with the map and survives fullscreen.
	Catalog↔Inventory is marked refactor (warning badge) and Sales→Inventory
	tolerated (outlined badge); everything else is by design and unmarked.
-->
<Story name="Petstore">
	{#snippet template()}
		<ModelProvider {model}><InteractiveDiagram {graph} /></ModelProvider>
	{/snippet}
</Story>

<Story name="Light">
	{#snippet template()}
		<Theme mode="light"><ModelProvider {model}><InteractiveDiagram {graph} /></ModelProvider></Theme>
	{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}
		<Theme mode="dark"><ModelProvider {model}><InteractiveDiagram {graph} /></ModelProvider></Theme>
	{/snippet}
</Story>
