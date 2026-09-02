<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ContextEdge from "./ContextEdge.svelte";
import EdgeHarness from "./EdgeHarness.svelte";

const { Story } = defineMeta({
	title: "Flow/ContextEdge",
	component: EdgeHarness,
	args: { edge: ContextEdge, type: "context" },
});
</script>

<Story name="Upstream/downstream with role ports" args={{ label: "U/D", data: { sourceLabel: "OHS+PL", targetLabel: "ACL" } }} />
<Story name="Implied (dashed)" args={{ label: "U/D", style: "stroke-dasharray: 5 4", data: { sourceLabel: "OHS", targetLabel: "CF" } }} />
<Story name="Shared kernel" args={{ label: "SK" }} />
<Story name="Separate ways" args={{ label: "SW" }} />
