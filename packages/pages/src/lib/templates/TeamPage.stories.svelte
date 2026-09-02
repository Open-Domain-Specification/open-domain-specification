<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ModelProvider from "../ModelProvider.svelte";
import { petstoreModel } from "../stories";
import TeamPage from "./TeamPage.svelte";

const model = petstoreModel();
const ws = model.workspace;
const team = [...ws.teams.values()][0];
const { Story } = defineMeta({
	title: "Templates/TeamPage",
	component: TeamPage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Petstore">
	<ModelProvider {model}>
		<div class="layout"><main><TeamPage {team} /></main></div>
	</ModelProvider>
</Story>
