<script module lang="ts">
import {
	ODSConsumableMap,
	ODSContextMap,
	ODSRelationMap,
} from "@open-domain-specification/core";
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import { consumableGraph, contextGraph, relationGraph } from "../flow/graph";
import InteractiveDiagram from "./InteractiveDiagram.svelte";

const { workspace } = petstoreModel();
const bc = [...workspace.boundedcontexts.values()][0];
const aggregate = [...bc.aggregates.values()][0];
const { Story } = defineMeta({
	title: "Organisms/InteractiveDiagram",
	component: InteractiveDiagram,
	parameters: { layout: "fullscreen" },
	args: { graph: contextGraph(ODSContextMap.fromWorkspace(workspace)) },
});
</script>

<Story name="Context map" args={{ graph: contextGraph(ODSContextMap.fromWorkspace(workspace)) }} />
<Story name="Consumable map (UML component diagram)" args={{ graph: consumableGraph(ODSConsumableMap.fromBoundedContext(bc)) }} />
<Story name="Relation map (UML class diagram)" args={{ graph: relationGraph(ODSRelationMap.fromAggregate(aggregate)) }} />
