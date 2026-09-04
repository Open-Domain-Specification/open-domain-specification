<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Demo from "./Organism.harness.svelte";
import StrategicPositionTable from "./StrategicPositionTable.svelte";

/**
 * Click a chevron to disclose the whole relationship detail in the docked
 * bottom sheet. The detail used to be drawn in a `colspan` row, which put its
 * crossings table inside this one; the sheet gives it a grid of its own and
 * keeps the row it came from on screen.
 */
const { Story } = defineMeta({
	title: "Organisms/StrategicPositionTable",
	component: StrategicPositionTable,
});

/** Opens the first row's sheet, so the story shows the disclosure it is about. */
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

<!-- The first row's evidence disclosed: the sheet docks to the foot of the
     preview frame, and the table above it stays readable. -->
<Story name="Sheet open" play={openFirstRow}>
	{#snippet template()}<Demo organism="position" mode="dark" />{/snippet}
</Story>
