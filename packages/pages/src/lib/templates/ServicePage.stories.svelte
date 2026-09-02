<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ModelProvider from "../ModelProvider.svelte";
import { petstoreModel } from "../stories";
import ServicePage from "./ServicePage.svelte";

const model = petstoreModel();
const service = [...model.workspace.boundedcontexts.values()].flatMap((bc) => [
	...bc.services.values(),
])[0];
const { Story } = defineMeta({
	title: "Templates/ServicePage",
	component: ServicePage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Petstore">
	<ModelProvider {model}>
		<div class="layout"><main><ServicePage {service} /></main></div>
	</ModelProvider>
</Story>
