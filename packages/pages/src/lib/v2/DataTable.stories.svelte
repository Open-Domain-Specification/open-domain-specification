<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Demo from "./DataTable.harness.svelte";
import DataTable from "./DataTable.svelte";
import Theme from "./Theme.harness.svelte";

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({ title: "V2/DataTable", component: DataTable });
</script>

<Story name="Light">
	{#snippet template()}<Theme mode="light"><Demo /></Theme>{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Theme mode="dark"><Demo /></Theme>{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Theme mode="hc"><Demo /></Theme>{/snippet}
</Story>

<!-- Click Consumable or Kind to sort; a second click reverses. -->
<Story name="Sortable">
	{#snippet template()}<Theme mode="dark"><Demo sortable /></Theme>{/snippet}
</Story>

<!-- Rows under label rows, the shape the strategic position takes. -->
<Story name="Grouped">
	{#snippet template()}<Theme mode="light"><Demo grouped /></Theme>{/snippet}
</Story>

<Story name="Density">
	{#snippet template()}<Theme mode="dark"><Demo dense sortable /></Theme>{/snippet}
</Story>

<!-- A row's own content under it, spanning every column: the shape the health
     report's comments and the strategic position's expanded detail take. -->
<Story name="Detail rows">
	{#snippet template()}<Theme mode="light"><Demo detail /></Theme>{/snippet}
</Story>

<Story name="Empty">
	{#snippet template()}<Theme mode="light"><Demo empty /></Theme>{/snippet}
</Story>
