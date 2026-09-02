<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ModelProvider from "../ModelProvider.svelte";
import { petstoreModel } from "../stories";
import PolicyPage from "./PolicyPage.svelte";

const model = petstoreModel();
const ws = model.workspace;
const policy = [...ws.boundedcontexts.values()].flatMap((bc) => [
	...bc.policies.values(),
])[0];
const { Story } = defineMeta({
	title: "Templates/PolicyPage",
	component: PolicyPage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Petstore">
	<ModelProvider {model}>
		<div class="layout"><main><PolicyPage {policy} /></main></div>
	</ModelProvider>
</Story>
