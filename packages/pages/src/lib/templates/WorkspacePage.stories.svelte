<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import ModelProvider from "../ModelProvider.svelte";
import WorkspacePage from "./WorkspacePage.svelte";

const { Story } = defineMeta({
	title: "Templates/WorkspacePage",
	component: WorkspacePage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Petstore">
	<ModelProvider model={petstoreModel()}>
		<div class="layout"><main><WorkspacePage /></main></div>
	</ModelProvider>
</Story>
