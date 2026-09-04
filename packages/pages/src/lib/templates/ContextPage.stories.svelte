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
	args: { context: target },
});
</script>

<Story name="Petstore">
	{#snippet template()}
		<ModelProvider {model}>
			<div class="layout"><main><ContextPage context={target} /></main></div>
		</ModelProvider>
	{/snippet}
</Story>
