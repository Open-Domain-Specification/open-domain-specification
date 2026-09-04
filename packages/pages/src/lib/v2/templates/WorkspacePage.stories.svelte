<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Demo from "./Template.harness.svelte";
import WorkspacePage from "./WorkspacePage.svelte";

const { Story } = defineMeta({
	title: "V2/Templates/WorkspacePage",
	component: WorkspacePage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Light">
	{#snippet template()}<Demo page="workspace" mode="light" />{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Demo page="workspace" mode="dark" />{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Demo page="workspace" mode="hc" />{/snippet}
</Story>
