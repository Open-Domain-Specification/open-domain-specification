<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ContextNode from "./ContextNode.svelte";
import NodeHarness from "./NodeHarness.svelte";

const { Story } = defineMeta({
	title: "Flow/ContextNode",
	component: NodeHarness,
	args: { node: ContextNode, type: "context" },
});
</script>

<Story name="With team and cluster" args={{ data: { id: "#/boundedcontexts/sales", type: "context", label: "Sales", icon: "boundedcontext", groupPath: "Petstore Commerce / Sales", cluster: "Petstore Commerce", team: "Sales Team", bigBallOfMud: false, description: "Takes orders." } }} />
<Story name="Big ball of mud" args={{ data: { id: "#/boundedcontexts/legacy", type: "context", label: "Legacy Store", icon: "boundedcontext", groupPath: "Petstore Commerce", cluster: "Petstore Commerce", team: "Platform", bigBallOfMud: true } }} />
<Story name="External system" args={{ data: { id: "#/boundedcontexts/card_scheme", type: "context", label: "Card Scheme", icon: "boundedcontext", bigBallOfMud: false, external: true, description: "The scheme the bank submits to. Not the bank's." } }} />
<Story name="Bare" args={{ data: { id: "#/boundedcontexts/x", type: "context", label: "X", icon: "boundedcontext", bigBallOfMud: false } }} />
