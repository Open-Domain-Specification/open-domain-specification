<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Demo from "./Organism.harness.svelte";
import StrategicPositionTable from "./StrategicPositionTable.svelte";

/** Click a chevron to expand a row into the whole relationship detail in place. */
const { Story } = defineMeta({
	title: "Organisms/StrategicPositionTable",
	component: StrategicPositionTable,
});
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
