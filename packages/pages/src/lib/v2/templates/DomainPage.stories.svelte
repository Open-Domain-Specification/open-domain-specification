<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import DomainPage from "./DomainPage.svelte";
import Demo from "./Template.harness.svelte";

const { Story } = defineMeta({
	title: "V2/Templates/DomainPage",
	component: DomainPage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Light">
	{#snippet template()}<Demo page="domain" mode="light" />{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Demo page="domain" mode="dark" />{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Demo page="domain" mode="hc" />{/snippet}
</Story>
