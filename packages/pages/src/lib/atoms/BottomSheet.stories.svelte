<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Theme from "../Theme.harness.svelte";
import Demo from "./BottomSheet.harness.svelte";
import BottomSheet from "./BottomSheet.svelte";

/**
 * The docked panel, in the frame of VS Code's own: a header row with the
 * view's name and a close button, a hairline under it, a border on top, and
 * the body scrolling inside. It is fixed to the bottom of the window it is
 * drawn in, so in Storybook it docks to the bottom of the preview frame.
 */
const { Story } = defineMeta({
	title: "Atoms/BottomSheet",
	component: BottomSheet,
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

<!-- Closed: the trigger is the only trace of it, and the page keeps its full height. -->
<Story name="Closed">
	{#snippet template()}<Theme mode="dark"><Demo open={false} /></Theme>{/snippet}
</Story>
