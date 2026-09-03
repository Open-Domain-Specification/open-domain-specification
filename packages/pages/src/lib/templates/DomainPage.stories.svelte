<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import ModelProvider from "../ModelProvider.svelte";
import DomainPage from "./DomainPage.svelte";

const model = petstoreModel();
const target = [...model.workspace.domains.values()][0];
const { Story } = defineMeta({
	title: "Templates/DomainPage",
	component: DomainPage,
	parameters: { layout: "fullscreen" },
	args: { domain: target },
});
</script>

<Story name="Petstore">
	<ModelProvider {model}>
		<div class="layout"><main><DomainPage domain={target} /></main></div>
	</ModelProvider>
</Story>
