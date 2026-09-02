<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ModelProvider from "../ModelProvider.svelte";
import { petstoreModel } from "../stories";
import SchemaPage from "./SchemaPage.svelte";

const model = petstoreModel();
const ws = model.workspace;
const schema = [...ws.boundedcontexts.values()].flatMap((bc) => [
	...bc.schemas.values(),
])[0];
const { Story } = defineMeta({
	title: "Templates/SchemaPage",
	component: SchemaPage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Petstore">
	<ModelProvider {model}>
		<div class="layout"><main><SchemaPage {schema} /></main></div>
	</ModelProvider>
</Story>
