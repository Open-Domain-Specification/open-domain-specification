<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ContextPage from "./ContextPage.svelte";
import Demo from "./Template.harness.svelte";

/**
 * Sales is the context every evidence surface uses: it touches all four
 * others, so its strategic position fills each of the three groups and shows a
 * marked relationship, a silent one and a well-evidenced one at once.
 */
const { Story } = defineMeta({
	title: "V2/Templates/ContextPage",
	component: ContextPage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Light">
	{#snippet template()}<Demo page="context" mode="light" />{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Demo page="context" mode="dark" />{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Demo page="context" mode="hc" />{/snippet}
</Story>
