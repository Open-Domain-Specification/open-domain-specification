<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import HealthReport from "./HealthReport.svelte";
import Demo from "./Organism.harness.svelte";

/** The three counts are the headings' badges; the comments are each row's detail. */
const { Story } = defineMeta({
	title: "V2/Organisms/HealthReport",
	component: HealthReport,
});
</script>

<Story name="Light">
	{#snippet template()}<Demo organism="health" mode="light" />{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Demo organism="health" mode="dark" />{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Demo organism="health" mode="hc" />{/snippet}
</Story>
