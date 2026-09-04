<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import TeamPage from "./TeamPage.svelte";
import Demo from "./Template.harness.svelte";

const { Story } = defineMeta({
	title: "V2/Templates/TeamPage",
	component: TeamPage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Light">
	{#snippet template()}<Demo page="team" mode="light" />{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Demo page="team" mode="dark" />{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Demo page="team" mode="hc" />{/snippet}
</Story>
