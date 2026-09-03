<script module lang="ts">
import {
	ODSConsumableMap,
	ODSContextMap,
	ODSRelationMap,
} from "@open-domain-specification/core";
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import { consumableGraph, contextGraph, relationGraph } from "./graph";
import Harness from "./LegendPanel.harness.svelte";
import LegendPanel from "./LegendPanel.svelte";

const { workspace } = petstoreModel();
const sales = workspace.boundedcontexts.get("sales_bc")!;
const order = sales.aggregates.get("order")!;
const { Story } = defineMeta({
	title: "Flow/LegendPanel",
	component: LegendPanel,
	render: Harness,
});
</script>

<Story name="Context map" args={{ graph: contextGraph(ODSContextMap.fromWorkspace(workspace)), kind: "context" }} />
<Story name="Consumable map" args={{ graph: consumableGraph(ODSConsumableMap.fromBoundedContext(sales)), kind: "consumable" }} />
<Story name="Relation map" args={{ graph: relationGraph(ODSRelationMap.fromAggregate(order)), kind: "relation" }} />
