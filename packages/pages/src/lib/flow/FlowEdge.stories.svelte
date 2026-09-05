<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import EdgeHarness from "./EdgeHarness.svelte";
import FlowEdge from "./FlowEdge.svelte";

const { Story } = defineMeta({
	title: "Flow/FlowEdge",
	component: EdgeHarness,
	args: { edge: FlowEdge, type: "flow" },
});
</script>

<!-- A step of the chain: a plain arrow from what happens to what happens next. -->
<Story name="A step" args={{ markerEnd: "arrow" }} />
<!-- The one edge that is not a step, so it is dashed and says so. -->
<Story name="What ends a process" args={{ label: "ends", markerEnd: "arrow", edgeClass: "dashed" }} />
