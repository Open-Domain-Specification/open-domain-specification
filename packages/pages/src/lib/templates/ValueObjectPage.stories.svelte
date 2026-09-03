<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import ModelProvider from "../ModelProvider.svelte";
import ValueObjectPage from "./ValueObjectPage.svelte";

const model = petstoreModel();
const ws = model.workspace;
const valueobject = [...ws.boundedcontexts.values()]
	.flatMap((bc) => [...bc.aggregates.values()])
	.flatMap((a) => [...a.valueobjects.values()])[0];
const { Story } = defineMeta({
	title: "Templates/ValueObjectPage",
	component: ValueObjectPage,
	parameters: { layout: "fullscreen" },
	args: { valueobject },
});
</script>

<Story name="Petstore">
	<ModelProvider {model}>
		<div class="layout"><main><ValueObjectPage {valueobject} /></main></div>
	</ModelProvider>
</Story>
