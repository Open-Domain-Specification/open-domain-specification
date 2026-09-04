<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel, rivermartModel } from "../fixtures";
import Page from "../Page.harness.svelte";
import Theme from "../Theme.harness.svelte";
import { PETSTORE_REFS } from "./petstore.harness";

// The harness renders the shipped route for a ref, so a story draws the
// page a host draws — the real template inside `PageLayout`, with a model
// in context — and cannot drift from it.
const model = petstoreModel();
// RiverMart's OrderPlaced is the reference payload with a shape inside it.
const rivermart = rivermartModel();
const NESTING_SCHEMA =
	"#/boundedcontexts/order_management/schemas/order_placed";
const { Story } = defineMeta({
	title: "Templates/SchemaPage",
	component: Page,
	parameters: { layout: "fullscreen" },
	args: { model, ref: PETSTORE_REFS.schema },
});
</script>

<Story name="Light">
	{#snippet template()}<Theme mode="light"><Page {model} ref={PETSTORE_REFS.schema} /></Theme>{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Theme mode="dark"><Page {model} ref={PETSTORE_REFS.schema} /></Theme>{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Theme mode="hc"><Page {model} ref={PETSTORE_REFS.schema} /></Theme>{/snippet}
</Story>

<!-- A payload with a shape inside it: the lines attribute links the schema that models it. -->
<Story name="Nested shape">
	{#snippet template()}<Theme mode="light"><Page model={rivermart} ref={NESTING_SCHEMA} /></Theme>{/snippet}
</Story>
