<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import HealthPage from "./HealthPage.svelte";
import Demo from "./Template.harness.svelte";

const { Story } = defineMeta({
	title: "V2/Templates/HealthPage",
	component: HealthPage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Light">
	{#snippet template()}<Demo page="health" mode="light" />{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Demo page="health" mode="dark" />{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Demo page="health" mode="hc" />{/snippet}
</Story>
