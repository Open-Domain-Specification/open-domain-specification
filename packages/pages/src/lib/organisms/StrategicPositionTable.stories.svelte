<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import {
	petstoreEvidence,
	strategicPositionFixture,
} from "../evidence/fixtures";
import Theme from "../evidence/Theme.harness.svelte";
import ModelProvider from "../ModelProvider.svelte";
import StrategicPositionTable from "./StrategicPositionTable.svelte";

const petstore = petstoreEvidence();
const one = strategicPositionFixture(1);
const three = strategicPositionFixture(3);
const eight = strategicPositionFixture(8);

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({
	title: "Organisms/StrategicPositionTable",
	component: StrategicPositionTable,
	parameters: { layout: "fullscreen" },
});
</script>

<!-- Click any row's chevron to expand the relationship detail in place. -->
<Story name="Petstore Sales">
	{#snippet template()}
		<ModelProvider model={petstore.model}>
			<StrategicPositionTable context={petstore.context} sheets={petstore.sheets} />
		</ModelProvider>
	{/snippet}
</Story>

<Story name="One relationship">
	{#snippet template()}
		<ModelProvider model={one.model}>
			<StrategicPositionTable context={one.context} sheets={one.sheets} />
		</ModelProvider>
	{/snippet}
</Story>

<Story name="Three relationships">
	{#snippet template()}
		<ModelProvider model={three.model}>
			<StrategicPositionTable context={three.context} sheets={three.sheets} />
		</ModelProvider>
	{/snippet}
</Story>

<Story name="Eight relationships">
	{#snippet template()}
		<ModelProvider model={eight.model}>
			<StrategicPositionTable context={eight.context} sheets={eight.sheets} />
		</ModelProvider>
	{/snippet}
</Story>

<Story name="Eight relationships, light">
	{#snippet template()}
		<Theme mode="light">
			<ModelProvider model={eight.model}>
				<StrategicPositionTable context={eight.context} sheets={eight.sheets} />
			</ModelProvider>
		</Theme>
	{/snippet}
</Story>

<Story name="Eight relationships, dark">
	{#snippet template()}
		<Theme mode="dark">
			<ModelProvider model={eight.model}>
				<StrategicPositionTable context={eight.context} sheets={eight.sheets} />
			</ModelProvider>
		</Theme>
	{/snippet}
</Story>
