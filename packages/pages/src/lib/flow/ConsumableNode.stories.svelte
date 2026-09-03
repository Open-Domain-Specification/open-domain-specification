<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ConsumableNode from "./ConsumableNode.svelte";
import NodeHarness from "./NodeHarness.svelte";

const { Story } = defineMeta({
	title: "Flow/ConsumableNode",
	component: NodeHarness,
	args: { node: ConsumableNode, type: "consumable" },
});
const pet = "#/boundedcontexts/catalog_bc/aggregates/pet";
</script>

<Story name="Component with lollipops" args={{ data: { id: pet, type: "consumable", label: "Pet", icon: "symbol-structure", groupPath: "Petstore Commerce / Catalog", description: "A pet for sale.", requires: [], slots: [{ id: `${pet}/provides/reserve_pet`, name: "Reserve Pet", kind: "operation", pattern: "open-host-service" }, { id: `${pet}/provides/pet_status_changed`, name: "Pet Status Changed", kind: "event", pattern: "published-language" }, { id: `${pet}/provides/pet_registered`, name: "Pet Registered", kind: "event" }] } }} />
<Story name="Consumer with sockets" args={{ data: { id: "#/boundedcontexts/sales_bc/services/checkout", type: "consumable", label: "Checkout", icon: "symbol-method", groupPath: "Petstore Commerce / Sales", slots: [], requires: [{ id: `${pet}/provides/reserve_pet`, name: "Reserve Pet", pattern: "anti-corruption-layer" }, { id: `${pet}/provides/pet_status_changed`, name: "Pet Status Changed", pattern: "conformist" }] } }} />
<Story name="Provider that also consumes" args={{ data: { id: pet, type: "consumable", label: "Pet", icon: "symbol-structure", groupPath: "Petstore Commerce / Catalog", slots: [{ id: `${pet}/provides/reserve_pet`, name: "Reserve Pet", kind: "operation", pattern: "open-host-service" }], requires: [{ id: "#/boundedcontexts/sales_bc/aggregates/order/provides/order_placed", name: "Order Placed" }] } }} />
<Story name="Bare component" args={{ data: { id: "#/boundedcontexts/x/services/y", type: "consumable", label: "Y", icon: "symbol-method", slots: [], requires: [] } }} />
<Story name="Floating handles" args={{ data: { id: pet, type: "consumable", label: "Pet", icon: "symbol-structure", floating: true, requires: [], slots: [{ id: `${pet}/provides/reserve_pet`, name: "Reserve Pet", kind: "operation", pattern: "open-host-service" }] } }} />
