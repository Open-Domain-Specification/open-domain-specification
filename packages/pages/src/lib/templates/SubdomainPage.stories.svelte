<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ModelProvider from "../ModelProvider.svelte";
import { petstoreModel } from "../stories";
import SubdomainPage from "./SubdomainPage.svelte";

const model = petstoreModel();
const target = [
	...[...model.workspace.domains.values()][0].subdomains.values(),
][0];
const { Story } = defineMeta({
	title: "Templates/SubdomainPage",
	component: SubdomainPage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Petstore">
	<ModelProvider {model}>
		<div class="layout"><main><SubdomainPage subdomain={target} /></main></div>
	</ModelProvider>
</Story>
