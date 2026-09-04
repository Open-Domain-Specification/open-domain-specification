<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Theme from "../Theme.harness.svelte";
import Demo from "./Section.harness.svelte";
import Section from "./Section.svelte";

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({
	title: "V2/Organisms/Section",
	component: Section,
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

<!-- The diagnostics for a section render where the Problems panel would draw
     them: severity glyph, rule id, message, and a link to the element. -->
<Story name="With problems">
	{#snippet template()}<Theme mode="dark"><Demo problems /></Theme>{/snippet}
</Story>

<!-- A section that lists nothing carries no badge. -->
<Story name="No count">
	{#snippet template()}<Theme mode="light"><Demo counted={false} /></Theme>{/snippet}
</Story>
