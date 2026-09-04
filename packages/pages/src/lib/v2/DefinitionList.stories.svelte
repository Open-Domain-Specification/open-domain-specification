<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Demo from "./DefinitionList.harness.svelte";
import DefinitionList from "./DefinitionList.svelte";
import Theme from "./Theme.harness.svelte";

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({
	title: "V2/DefinitionList",
	component: DefinitionList,
});
</script>

<Story name="Light">
	{#snippet template()}<Theme mode="light"><Demo /></Theme>{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Theme mode="dark"><Demo /></Theme>{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Theme mode="hc"><Demo /></Theme>{/snippet}
</Story>

<Story name="Density">
	{#snippet template()}<Theme mode="dark"><Demo dense /></Theme>{/snippet}
</Story>
