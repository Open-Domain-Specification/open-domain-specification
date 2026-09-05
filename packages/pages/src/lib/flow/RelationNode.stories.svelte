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
<!-- A value of another context, held here over a shared kernel: the stereotype says it is borrowed and the subtitle names the context that owns it. -->
<Story name="Borrowed value object" args={{ data: { id: "#/money", type: "relation", label: "Money", icon: "symbol-constant", groupPath: "Shared Kernel", chips: ["borrowed value object"], tone: "muted", borrowed: true, attributes: [{ name: "amountMinor", type: "int64", identity: false }, { name: "currency", type: "ISO 4217 code", identity: false }] } }} />
<Story name="Floating handles" args={{ data: { id: "#/order", type: "relation", label: "Order", icon: "symbol-field", chips: ["root entity"], tone: "core", floating: true, attributes: [{ name: "id", type: "string", identity: true }] } }} />
