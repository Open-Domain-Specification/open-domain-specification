<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Harness from "./DiagramOptionsPanel.harness.svelte";

const { Story } = defineMeta({
	title: "Flow/DiagramOptionsPanel",
	component: Harness,
});
</script>

<Story name="Expanded" args={{ kind: "context" }} />
<!-- What a map with no room for the panel shows: the header row alone, ready to open. -->
<Story name="Collapsed by the fit" args={{ kind: "context", crowded: true }} />
