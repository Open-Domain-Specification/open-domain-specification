<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../../fixtures";
import Compare from "./Compare.harness.svelte";
import { PETSTORE_REFS } from "./petstore.harness";

// Two 1200px columns, v1 on the left and v2 on the right, for the review.
const model = petstoreModel();
const { Story } = defineMeta({
	title: "V2/Compare/ServicePage",
	component: Compare,
	parameters: { layout: "fullscreen" },
	args: { model, ref: PETSTORE_REFS.service },
});
</script>

<Story name="v1 and v2">
	{#snippet template()}<Compare {model} ref={PETSTORE_REFS.service} />{/snippet}
</Story>
