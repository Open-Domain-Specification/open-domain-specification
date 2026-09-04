<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import SubdomainPage from "./SubdomainPage.svelte";
import Demo from "./Template.harness.svelte";

const { Story } = defineMeta({
	title: "V2/Templates/SubdomainPage",
	component: SubdomainPage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Light">
	{#snippet template()}<Demo page="subdomain" mode="light" />{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Demo page="subdomain" mode="dark" />{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Demo page="subdomain" mode="hc" />{/snippet}
</Story>
