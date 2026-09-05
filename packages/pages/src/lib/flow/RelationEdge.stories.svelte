<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import EdgeHarness from "./EdgeHarness.svelte";
import RelationEdge from "./RelationEdge.svelte";

const { Story } = defineMeta({
	title: "Flow/RelationEdge",
	component: EdgeHarness,
	parameters: { layout: "centered" },
	args: { edge: RelationEdge },
});
</script>

<Story name="Includes (composition)" args={{ type: "relation-includes", label: "attempted-by", data: { sourceLabel: "1", targetLabel: "*" } }} />
<Story name="References (association)" args={{ type: "relation-references", label: "for-pet", data: { targetLabel: "1" } }} />
<Story name="Uses (dependency)" args={{ type: "relation-uses", label: "has-status", data: { targetLabel: "0..1" } }} />
<Story name="Identifies (foreign root)" args={{ type: "relation-identifies", label: "petId" }} />
