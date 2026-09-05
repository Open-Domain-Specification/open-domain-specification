<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import Page from "../Page.harness.svelte";
import Theme from "../Theme.harness.svelte";
import { PETSTORE_REFS } from "./petstore.harness";

// The harness renders the shipped route for a ref, so a story draws the
// page a host draws — the real template inside `PageLayout`, with a model
// in context — and cannot drift from it.
const model = petstoreModel();
const { Story } = defineMeta({
	title: "Templates/ProcessPage",
	component: Page,
	parameters: { layout: "fullscreen" },
	args: { model, ref: PETSTORE_REFS.process },
});
</script>

<Story name="Light">
	{#snippet template()}<Theme mode="light"><Page {model} ref={PETSTORE_REFS.process} /></Theme>{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Theme mode="dark"><Page {model} ref={PETSTORE_REFS.process} /></Theme>{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Theme mode="hc"><Page {model} ref={PETSTORE_REFS.process} /></Theme>{/snippet}
</Story>
