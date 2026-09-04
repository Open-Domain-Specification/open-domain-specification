<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import ModelProvider from "../ModelProvider.svelte";
import SubdomainPage from "./SubdomainPage.svelte";

const model = petstoreModel();
const target = [
	...[...model.workspace.domains.values()][0].subdomains.values(),
][0];
const { Story } = defineMeta({
	title: "Templates/SubdomainPage",
	component: SubdomainPage,
	parameters: { layout: "fullscreen" },
	args: { subdomain: target },
});
</script>

<Story name="Petstore">
	{#snippet template()}
		<ModelProvider {model}>
			<div class="layout"><main><SubdomainPage subdomain={target} /></main></div>
		</ModelProvider>
	{/snippet}
</Story>
