<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import NodeHarness from "./NodeHarness.svelte";
import RelationNode from "./RelationNode.svelte";

const { Story } = defineMeta({
	title: "Flow/RelationNode",
	component: NodeHarness,
	parameters: { layout: "centered" },
	args: { node: RelationNode, type: "relation" },
});
</script>

<Story name="Root entity" args={{ data: { id: "#/order", type: "relation", label: "Order", icon: "symbol-field", groupPath: "Sales / Order", chips: ["root entity"], tone: "core", attributes: [{ name: "id", type: "string", identity: true }, { name: "status", type: "OrderStatus", identity: false }, { name: "quantity", type: "Quantity", identity: false }] } }} />
<Story name="Entity" args={{ data: { id: "#/delivery", type: "relation", label: "DeliveryAttempt", icon: "symbol-field", groupPath: "Fulfilment / Shipment", chips: ["entity"], attributes: [{ name: "id", type: "string", identity: true }, { name: "attemptedAt", type: "Date", identity: false }] } }} />
<Story name="Value object without attributes" args={{ data: { id: "#/status", type: "relation", label: "OrderStatus", icon: "symbol-constant", groupPath: "Sales / Order", chips: ["value object"], tone: "muted" } }} />
<Story name="Floating handles" args={{ data: { id: "#/order", type: "relation", label: "Order", icon: "symbol-field", chips: ["root entity"], tone: "core", floating: true, attributes: [{ name: "id", type: "string", identity: true }] } }} />
