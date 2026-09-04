<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import ModelProvider from "../ModelProvider.svelte";
import TeamPage from "./TeamPage.svelte";

const model = petstoreModel();
const ws = model.workspace;
const team = [...ws.teams.values()][0];
const { Story } = defineMeta({
	title: "Templates/TeamPage",
	component: TeamPage,
	parameters: { layout: "fullscreen" },
	args: { team },
});
</script>

<Story name="Petstore">
	{#snippet template()}
		<ModelProvider {model}>
			<div class="layout"><main><TeamPage {team} /></main></div>
		</ModelProvider>
	{/snippet}
</Story>
