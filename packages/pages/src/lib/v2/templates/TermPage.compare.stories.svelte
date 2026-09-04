<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Compare from "./Compare.harness.svelte";
import { PETSTORE_REFS } from "./petstore.harness";

// Two 1200px columns, v1 on the left and v2 on the right, for the review. A
// tactical page is named by the ref of the element it is about, so both
// columns draw the same one.
const { Story } = defineMeta({
	title: "V2/Compare/TermPage",
	component: Compare,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="v1 and v2">
	{#snippet template()}<Compare ref={PETSTORE_REFS.term} />{/snippet}
</Story>
