<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import ModelProvider from "../ModelProvider.svelte";
import ConsumablePage from "./ConsumablePage.svelte";
import { consumablesOf } from "./elements";

const model = petstoreModel();
const all = [...consumablesOf(model.workspace)];
const event = all.find((c) => c.type === "event") ?? all[0];
const operation = all.find((c) => c.type !== "event") ?? all[0];
const { Story } = defineMeta({
	title: "Templates/ConsumablePage",
	component: ConsumablePage,
	parameters: { layout: "fullscreen" },
});
</script>

<Story name="Event">
	<ModelProvider {model}>
		<div class="layout"><main><ConsumablePage consumable={event} /></main></div>
	</ModelProvider>
</Story>

<Story name="Operation">
	<ModelProvider {model}>
		<div class="layout"><main><ConsumablePage consumable={operation} /></main></div>
	</ModelProvider>
</Story>
