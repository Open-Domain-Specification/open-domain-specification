<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import {
	petstoreEvidence,
	strategicPositionFixture,
} from "../evidence/fixtures";
import Theme from "../evidence/Theme.harness.svelte";
import ModelProvider from "../ModelProvider.svelte";
import HealthReport from "./HealthReport.svelte";

const petstore = petstoreEvidence();
const dense = strategicPositionFixture(8);

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({
	title: "Organisms/HealthReport",
	component: HealthReport,
	parameters: { layout: "padded" },
});
</script>

<!-- The no-facts section starts collapsed; open it to see the reconciliation list. -->
<Story name="Petstore">
	{#snippet template()}
		<ModelProvider model={petstore.model}><HealthReport sheets={petstore.sheets} /></ModelProvider>
	{/snippet}
</Story>

<Story name="Eight relationships">
	{#snippet template()}
		<ModelProvider model={dense.model}><HealthReport sheets={dense.sheets} /></ModelProvider>
	{/snippet}
</Story>

<Story name="Petstore, light">
	{#snippet template()}
		<Theme mode="light">
			<ModelProvider model={petstore.model}><HealthReport sheets={petstore.sheets} /></ModelProvider>
		</Theme>
	{/snippet}
</Story>

<Story name="Petstore, dark">
	{#snippet template()}
		<Theme mode="dark">
			<ModelProvider model={petstore.model}><HealthReport sheets={petstore.sheets} /></ModelProvider>
		</Theme>
	{/snippet}
</Story>
