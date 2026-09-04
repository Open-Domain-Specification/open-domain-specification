<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../../fixtures";
import Theme from "../Theme.harness.svelte";
import Page from "./Page.harness.svelte";
import { PETSTORE_REFS } from "./petstore.harness";

// The harness is the story's component so the page always renders inside
// `v2/PageLayout` with a model in context, as a host renders it.
const model = petstoreModel();
const { Story } = defineMeta({
	title: "V2/Templates/AggregatePage",
	component: Page,
	parameters: { layout: "fullscreen" },
	args: { model, ref: PETSTORE_REFS.aggregate },
});
</script>

<Story name="Light">
	{#snippet template()}<Theme mode="light"><Page {model} ref={PETSTORE_REFS.aggregate} /></Theme>{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Theme mode="dark"><Page {model} ref={PETSTORE_REFS.aggregate} /></Theme>{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Theme mode="hc"><Page {model} ref={PETSTORE_REFS.aggregate} /></Theme>{/snippet}
</Story>
