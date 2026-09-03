<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import ModelProvider from "../ModelProvider.svelte";
import SubdomainCard from "./SubdomainCard.svelte";

const model = petstoreModel();
const subdomains = [...model.workspace.domains.values()].flatMap((d) => [
	...d.subdomains.values(),
]);
const { Story } = defineMeta({
	title: "Molecules/SubdomainCard",
	component: SubdomainCard,
	args: { subdomain: subdomains[0] },
});
</script>

<Story name="Petstore subdomains">
	<ModelProvider {model}>
		<div class="grid">{#each subdomains as s}<SubdomainCard subdomain={s} />{/each}</div>
	</ModelProvider>
</Story>
