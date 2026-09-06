<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Theme from "../Theme.harness.svelte";
import Demo from "./Lockup.harness.svelte";
import Lockup from "./Lockup.svelte";

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({ title: "Atoms/Lockup", component: Lockup });
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

<!-- Every kind the pages know, as a list at the platform's row height. -->
<Story name="Density">
	{#snippet template()}<Theme mode="dark"><Demo dense /></Theme>{/snippet}
</Story>
