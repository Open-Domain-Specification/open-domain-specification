<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Demo from "./Organism.harness.svelte";
import RelationshipDetail from "./RelationshipDetail.svelte";

/** The block as it appears inside an expanded strategic position row. */
const { Story } = defineMeta({
	title: "Organisms/RelationshipDetail",
	component: RelationshipDetail,
});
</script>

<Story name="Light">
	{#snippet template()}<Demo organism="relationship" mode="light" />{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Demo organism="relationship" mode="dark" />{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Demo organism="relationship" mode="hc" />{/snippet}
</Story>
