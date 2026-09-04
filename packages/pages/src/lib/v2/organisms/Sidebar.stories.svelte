<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Theme from "../Theme.harness.svelte";
import Demo from "./Sidebar.harness.svelte";
import Sidebar from "./Sidebar.svelte";

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({
	title: "V2/Organisms/Sidebar",
	component: Sidebar,
});
</script>

<Story name="Light">
	{#snippet template()}<Theme mode="light"><Demo /></Theme>{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Theme mode="dark"><Demo /></Theme>{/snippet}
</Story>

<!-- High contrast draws selection and hover as the dashed contrast outline
     rather than a wash, as the workbench tree does. -->
<Story name="High contrast">
	{#snippet template()}<Theme mode="hc"><Demo /></Theme>{/snippet}
</Story>

<!-- Nothing selected: every row is at rest, 22px apart, 16px per level. -->
<Story name="Density">
	{#snippet template()}<Theme mode="dark"><Demo current="#" /></Theme>{/snippet}
</Story>
