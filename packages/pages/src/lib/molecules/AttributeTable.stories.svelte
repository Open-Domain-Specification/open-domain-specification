<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Theme from "../Theme.harness.svelte";
import Demo from "./AttributeTable.harness.svelte";
import AttributeTable from "./AttributeTable.svelte";

/**
 * The petstore's Pet in the three theme sets: the key codicon on the identity,
 * linked types, and the `optional` keyword on the attributes the Swagger
 * contract does not require. The keyword is in the secondary colour, so what
 * the reader scans is still the column of names.
 */
const { Story } = defineMeta({
	title: "Molecules/AttributeTable",
	component: AttributeTable,
	parameters: { layout: "padded" },
});
</script>

<Story name="Light">
	{#snippet template()}<Theme mode="light"><Demo /></Theme>{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Theme mode="dark"><Demo /></Theme>{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Theme mode="hc"><Demo /></Theme>{/snippet}
</Story>
