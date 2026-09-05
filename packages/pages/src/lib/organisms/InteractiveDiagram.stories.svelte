<script module lang="ts">
import {
	ODSConsumableMap,
	ODSContextMap,
	ODSFlowMap,
	ODSRelationMap,
} from "@open-domain-specification/core";
import { defineMeta } from "@storybook/addon-svelte-csf";
import { petstoreModel } from "../fixtures";
import {
	consumableGraph,
	contextGraph,
	flowGraph,
	relationGraph,
} from "../flow/graph";
import InteractiveDiagram from "./InteractiveDiagram.svelte";
import ThemeHarness from "./InteractiveDiagram.theme.harness.svelte";

const { workspace } = petstoreModel();
const bc = [...workspace.boundedcontexts.values()][0];
// Sales is the one context with a process, so its flow map shows a whole
// lifecycle: what starts an instance, what it issues, and the dashed edge to
// the fact that ends it.
const sales = workspace.boundedcontexts.get("sales_bc")!;
const fulfilment = sales.processes.get("order_fulfilment")!;
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
<Story name="Flow map (the reaction chain)" args={{ graph: flowGraph(ODSFlowMap.fromBoundedContext(sales)) }} />
<Story name="Flow map with the page's own process marked" args={{ graph: flowGraph(ODSFlowMap.fromBoundedContext(sales), fulfilment.ref) }} />

<!-- The controls and minimap take their colours from the host editor theme, not from the OS. -->
<Story name="Dark VS Code theme">
	{#snippet template(args)}
		<ThemeHarness graph={args.graph} themeClass="vscode-dark" />
	{/snippet}
</Story>
<Story name="Light VS Code theme">
	{#snippet template(args)}
		<ThemeHarness graph={args.graph} themeClass="vscode-light" />
	{/snippet}
</Story>
