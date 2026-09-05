<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import { ICONS } from "../icons";
import FlowNode from "./FlowNode.svelte";
import NodeHarness from "./NodeHarness.svelte";

const { Story } = defineMeta({
	title: "Flow/FlowNode",
	component: NodeHarness,
	args: { node: FlowNode, type: "flow" },
});
const order = "#/boundedcontexts/sales_bc/aggregates/order";
const sales = "#/boundedcontexts/sales_bc";
</script>

<!-- One story per step, in the shape the static renderer draws it in. -->
<Story name="Event (stadium)" args={{ data: { id: `${order}/provides/order_placed`, type: "flow", step: "event", label: "OrderPlaced", icon: ICONS.event, groupPath: "Sales / Order", description: "A customer placed an order." } }} />
<Story name="Operation (box)" args={{ data: { id: `${order}/provides/approve_order`, type: "flow", step: "command", label: "ApproveOrder", icon: ICONS.command, groupPath: "Sales / Order", description: "Approves the oldest order for a pet." } }} />
<Story name="Policy (note)" args={{ data: { id: "#/boundedcontexts/inventory_bc/policies/recount_on_stock_change", type: "flow", step: "policy", label: "Recount on stock change", icon: ICONS.policy, groupPath: "Inventory", description: "Whenever stock changes, recount it." } }} />
<Story name="Process (folder)" args={{ data: { id: `${sales}/processes/order_fulfilment`, type: "flow", step: "process", label: "Order fulfilment", icon: ICONS.process, groupPath: "Sales", description: "From an order being placed to the pet being sold." } }} />
<!-- On a policy or process page the page's own reaction is marked by weight, never by hue. -->
<Story name="The page's own reaction" args={{ data: { id: `${sales}/processes/order_fulfilment`, type: "flow", step: "process", label: "Order fulfilment", icon: ICONS.process, groupPath: "Sales", focus: true } }} />
<Story name="Floating handles" args={{ data: { id: `${order}/provides/order_placed`, type: "flow", step: "event", label: "OrderPlaced", icon: ICONS.event, floating: true } }} />
