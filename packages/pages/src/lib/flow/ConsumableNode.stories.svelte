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

<Story name="Provider with slot ports" args={{ data: { id: pet, type: "consumable", label: "Pet", icon: "symbol-structure", groupPath: "Petstore Commerce / Catalog", description: "A pet for sale.", slots: [{ id: `${pet}/provides/reserve_pet`, name: "Reserve Pet", kind: "operation", pattern: "open-host-service" }, { id: `${pet}/provides/pet_status_changed`, name: "Pet Status Changed", kind: "event", pattern: "published-language" }, { id: `${pet}/provides/pet_registered`, name: "Pet Registered", kind: "event" }] } }} />
<Story name="Consumer only" args={{ data: { id: "#/boundedcontexts/sales_bc/services/checkout", type: "consumable", label: "Checkout", icon: "symbol-method", groupPath: "Petstore Commerce / Sales", slots: [] } }} />
<Story name="Floating handles" args={{ data: { id: pet, type: "consumable", label: "Pet", icon: "symbol-structure", floating: true, slots: [{ id: `${pet}/provides/reserve_pet`, name: "Reserve Pet", kind: "operation", pattern: "open-host-service" }] } }} />
