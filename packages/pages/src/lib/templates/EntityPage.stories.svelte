<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import ModelProvider from "../ModelProvider.svelte";
import EntityPage from "./EntityPage.svelte";

const model = petstoreModel();
const ws = model.workspace;
const entity = [...ws.boundedcontexts.values()]
	.flatMap((bc) => [...bc.aggregates.values()])
	.flatMap((a) => [...a.entities.values()])[0];
const { Story } = defineMeta({
	title: "Templates/EntityPage",
	component: EntityPage,
	parameters: { layout: "fullscreen" },
	args: { entity },
});
</script>

<Story name="Petstore">
	<ModelProvider {model}>
		<div class="layout"><main><EntityPage {entity} /></main></div>
	</ModelProvider>
</Story>
