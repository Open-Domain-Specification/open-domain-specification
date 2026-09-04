<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Theme from "../Theme.harness.svelte";
import Demo from "./InvariantsSection.harness.svelte";
import InvariantsSection from "./InvariantsSection.svelte";

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({
	title: "Organisms/InvariantsSection",
	component: InvariantsSection,
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

<!-- The aggregate page's third column: what each rule names, or the whole
     aggregate when it names nothing in particular. -->
<Story name="With constrains">
	{#snippet template()}<Theme mode="light"><Demo constrains dense /></Theme>{/snippet}
</Story>

<Story name="Density">
	{#snippet template()}<Theme mode="dark"><Demo dense constrains /></Theme>{/snippet}
</Story>

<Story name="Empty">
	{#snippet template()}<Theme mode="light"><Demo empty /></Theme>{/snippet}
</Story>
