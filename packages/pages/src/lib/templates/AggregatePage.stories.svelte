<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ModelProvider from "../ModelProvider.svelte";
import { petstoreModel } from "../stories";
import AggregatePage from "./AggregatePage.svelte";

const model = petstoreModel();
const aggregate = [...model.workspace.boundedcontexts.values()].flatMap(
	(bc) => [...bc.aggregates.values()],
)[0];
const { Story } = defineMeta({
	title: "Templates/AggregatePage",
	component: AggregatePage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Petstore">
	<ModelProvider {model}>
		<div class="layout"><main><AggregatePage {aggregate} /></main></div>
	</ModelProvider>
</Story>
