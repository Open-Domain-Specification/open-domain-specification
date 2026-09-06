<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Demo from "./Organism.harness.svelte";
import StrategicPositionTable from "./StrategicPositionTable.svelte";

/**
 * Click a chevron to disclose the whole relationship detail in a modal. The
 * detail used to be drawn in a `colspan` row, which put its crossings table
 * inside this one, and then in a docked sheet, which took two fifths of a
 * short webview; the modal gives it a grid of its own and gives the page back
 * untouched when it closes.
 */
const { Story } = defineMeta({
	title: "Organisms/StrategicPositionTable",
	component: StrategicPositionTable,
});

/** Opens the first row's modal, so the story shows the disclosure it is about. */
const openFirstRow = async ({
	canvasElement,
}: {
	canvasElement: HTMLElement;
}) => {
	const toggle = canvasElement.querySelector(
		".strategic-position .toggle",
	) as HTMLButtonElement | null;
	toggle?.click();
};
</script>

<Story name="Light">
	{#snippet template()}<Demo organism="position" mode="light" />{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Demo organism="position" mode="dark" />{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Demo organism="position" mode="hc" />{/snippet}
</Story>

<!-- The first row's evidence disclosed: the modal centres over the preview
     frame with the table dimmed behind it. -->
<Story name="Modal open" play={openFirstRow}>
	{#snippet template()}<Demo organism="position" mode="dark" />{/snippet}
</Story>

<!-- The same disclosure at the size of an editor tab, which is the window it
     has to fit: a typical relationship reads without the modal's body
     scrolling, and the page is still visible either side of it. -->
<Story
	name="Modal open at editor height"
	play={openFirstRow}
	parameters={{
		viewport: {
			options: {
				editor: {
					name: "Editor tab",
					styles: { width: "1150px", height: "700px" },
				},
			},
			value: "editor",
		},
	}}
>
	{#snippet template()}<Demo organism="position" mode="dark" />{/snippet}
</Story>
