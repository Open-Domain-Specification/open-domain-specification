<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import ModelProvider from "../ModelProvider.svelte";
import ContextPage from "./ContextPage.svelte";

const model = petstoreModel();
const target = [...model.workspace.boundedcontexts.values()][0];
const { Story } = defineMeta({
	title: "Templates/ContextPage",
	component: ContextPage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Petstore">
	<ModelProvider {model}>
		<div class="layout"><main><ContextPage context={target} /></main></div>
	</ModelProvider>
</Story>
