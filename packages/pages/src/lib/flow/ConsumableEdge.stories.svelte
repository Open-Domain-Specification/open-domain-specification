<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import ConsumableEdge from "./ConsumableEdge.svelte";
import EdgeHarness from "./EdgeHarness.svelte";

const { Story } = defineMeta({
	title: "Flow/ConsumableEdge",
	component: EdgeHarness,
	args: { edge: ConsumableEdge, type: "consumable" },
});
</script>

<Story name="Assembly connector with fallback pattern ports" args={{ label: "Reserve Pet", data: { sourceLabel: "anti-corruption-layer", targetLabel: "open-host-service" } }} />
<Story name="Event, conformist consumer" args={{ label: "Pet Status Changed", data: { sourceLabel: "conformist", targetLabel: "published-language" } }} />
<Story name="No patterns" args={{ label: "Get Pet Summary" }} />
<!-- Hover the line: only one operation of the consumer makes this call. -->
<Story name="Made by one operation" args={{ label: "Reserve Pet For Order", data: { sourceLabel: "anti-corruption-layer", targetLabel: "open-host-service", by: ["ReservePet"] } }} />
