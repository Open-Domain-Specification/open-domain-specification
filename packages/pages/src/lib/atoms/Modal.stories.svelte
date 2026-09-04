<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Theme from "../Theme.harness.svelte";
import Demo from "./Modal.harness.svelte";
import Modal from "./Modal.svelte";

/**
 * The centred panel, in the frame of VS Code's own modal dialog: the widget
 * surface with the widget border and shadow, a title row with a close button,
 * a body that scrolls, and the page dimmed behind it. It is fixed to the
 * window it is drawn in, so in Storybook it centres over the preview frame.
 */
const { Story } = defineMeta({
	title: "Atoms/Modal",
	component: Modal,
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

<!-- Closed: the trigger is the only trace of it, and the page is undimmed. -->
<Story name="Closed">
	{#snippet template()}<Theme mode="dark"><Demo open={false} /></Theme>{/snippet}
</Story>
