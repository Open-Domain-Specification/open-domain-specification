<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Theme from "../Theme.harness.svelte";
import Demo from "./LanguageSection.harness.svelte";
import LanguageSection from "./LanguageSection.svelte";

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({
	title: "V2/Organisms/LanguageSection",
	component: LanguageSection,
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

<!-- Two contexts with a word each for the same aggregate: the pills are gone,
     so a list of terms is a list of links, comma-separated. -->
<Story name="Two terms">
	{#snippet template()}<Theme mode="light"><Demo variant="two" /></Theme>{/snippet}
</Story>

<Story name="Empty">
	{#snippet template()}<Theme mode="dark"><Demo variant="none" /></Theme>{/snippet}
</Story>
