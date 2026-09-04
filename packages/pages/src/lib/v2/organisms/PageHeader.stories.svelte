<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Theme from "../Theme.harness.svelte";
import Demo from "./PageHeader.harness.svelte";
import PageHeader from "./PageHeader.svelte";

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({
	title: "V2/Organisms/PageHeader",
	component: PageHeader,
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

<!-- A workspace page: no crumbs, no description, no facts — just the title
     lockup with its id and the kind word after it. -->
<Story name="Title only">
	{#snippet template()}<Theme mode="light"><Demo bare /></Theme>{/snippet}
</Story>
