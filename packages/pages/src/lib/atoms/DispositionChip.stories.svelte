<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import States from "../evidence/DispositionStates.harness.svelte";
import Theme from "../evidence/Theme.harness.svelte";
import DispositionChip from "./DispositionChip.svelte";

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({
	title: "Atoms/DispositionChip",
	component: DispositionChip,
});
</script>

<Story name="States">
	{#snippet template()}<States />{/snippet}
</Story>

<Story name="Light">
	{#snippet template()}<Theme mode="light"><States /></Theme>{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Theme mode="dark"><States /></Theme>{/snippet}
</Story>
