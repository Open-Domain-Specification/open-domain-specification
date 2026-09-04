<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Demo from "./HoverCard.harness.svelte";
import HoverCard from "./HoverCard.svelte";
import Theme from "./Theme.harness.svelte";

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({ title: "V2/HoverCard", component: HoverCard });
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

<!-- The evidence summary a map badge discloses. -->
<Story name="Evidence, dark">
	{#snippet template()}<Theme mode="dark"><Demo variant="evidence" /></Theme>{/snippet}
</Story>

<Story name="Evidence, light">
	{#snippet template()}<Theme mode="light"><Demo variant="evidence" /></Theme>{/snippet}
</Story>
