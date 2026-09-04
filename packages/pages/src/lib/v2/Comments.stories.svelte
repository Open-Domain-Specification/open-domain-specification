<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Demo from "./Comments.harness.svelte";
import Comments from "./Comments.svelte";
import Theme from "./Theme.harness.svelte";

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({ title: "V2/Comments", component: Comments });
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

<Story name="Empty">
	{#snippet template()}<Theme mode="light"><Demo empty /></Theme>{/snippet}
</Story>
