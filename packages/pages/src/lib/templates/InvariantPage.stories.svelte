<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ModelProvider from "../ModelProvider.svelte";
import { petstoreModel } from "../stories";
import InvariantPage from "./InvariantPage.svelte";

const model = petstoreModel();
const ws = model.workspace;
const invariant = [...ws.boundedcontexts.values()]
	.flatMap((bc) => [...bc.aggregates.values()])
	.flatMap((a) => [...a.invariants.values()])[0];
const { Story } = defineMeta({
	title: "Templates/InvariantPage",
	component: InvariantPage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Petstore">
	<ModelProvider {model}>
		<div class="layout"><main><InvariantPage {invariant} /></main></div>
	</ModelProvider>
</Story>
