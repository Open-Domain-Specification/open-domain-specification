<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import ModelProvider from "../ModelProvider.svelte";
import TermPage from "./TermPage.svelte";

const model = petstoreModel();
const ws = model.workspace;
const term = [...ws.boundedcontexts.values()].flatMap((bc) => [
	...bc.glossary.values(),
])[0];
const { Story } = defineMeta({
	title: "Templates/TermPage",
	component: TermPage,
	parameters: { layout: "fullscreen" },
	args: { term },
});
</script>

<Story name="Petstore">
	{#snippet template()}
		<ModelProvider {model}>
			<div class="layout"><main><TermPage {term} /></main></div>
		</ModelProvider>
	{/snippet}
</Story>
