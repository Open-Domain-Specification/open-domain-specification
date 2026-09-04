<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import RelationshipPage from "./RelationshipPage.svelte";
import Demo from "./Template.harness.svelte";

/** The one petstore relationship marked for refactoring, so the page shows a disposition. */
const { Story } = defineMeta({
	title: "V2/Templates/RelationshipPage",
	component: RelationshipPage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Light">
	{#snippet template()}<Demo page="relationship" mode="light" />{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Demo page="relationship" mode="dark" />{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Demo page="relationship" mode="hc" />{/snippet}
</Story>
