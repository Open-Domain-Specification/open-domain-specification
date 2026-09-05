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
	title: "Templates/ConsumablePage",
	component: Page,
	parameters: { layout: "fullscreen" },
	args: { model, ref: PETSTORE_REFS.operation },
});
</script>

<Story name="Light">
	{#snippet template()}<Theme mode="light"><Page {model} ref={PETSTORE_REFS.operation} /></Theme>{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Theme mode="dark"><Page {model} ref={PETSTORE_REFS.operation} /></Theme>{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Theme mode="hc"><Page {model} ref={PETSTORE_REFS.operation} /></Theme>{/snippet}
</Story>

<!-- An event, whose raised-by and reacted-to-by sections replace the operation's raises and issued-by. -->
<Story name="Event">
	{#snippet template()}<Theme mode="light"><Page {model} ref={PETSTORE_REFS.event} /></Theme>{/snippet}
</Story>

<!-- A query: asked with one schema, answered with another, so the Returns section draws under Payload. -->
<Story name="Query with returns">
	{#snippet template()}<Theme mode="light"><Page {model} ref={PETSTORE_REFS.query} /></Theme>{/snippet}
</Story>

<!-- An operation that names what it refuses with, so the Rejects with section draws one attribute table per rejection. -->
<Story name="Operation with rejections">
	{#snippet template()}<Theme mode="light"><Page {model} ref={PETSTORE_REFS.operation} /></Theme>{/snippet}
</Story>

<!-- An operation an invariant names, so the Invariants section lists the rule it has to uphold. -->
<Story name="Guarded operation">
	{#snippet template()}<Theme mode="light"><Page {model} ref={PETSTORE_REFS.guardedOperation} /></Theme>{/snippet}
</Story>
