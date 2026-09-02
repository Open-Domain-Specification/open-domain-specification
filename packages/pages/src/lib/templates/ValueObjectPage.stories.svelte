<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ModelProvider from "../ModelProvider.svelte";
import { petstoreModel } from "../stories";
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
});
</script>

<Story name="Petstore">
	<ModelProvider {model}>
		<div class="layout"><main><ValueObjectPage {valueobject} /></main></div>
	</ModelProvider>
</Story>
