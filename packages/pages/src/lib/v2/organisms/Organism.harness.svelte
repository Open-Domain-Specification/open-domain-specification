<script module lang="ts">
/** Which evidence organism a `V2/Organisms/...` story draws. */
export type OrganismName = "position" | "relationship" | "health";
</script>

<script lang="ts">
import { dispositionOf } from "@open-domain-specification/core";
import { petstoreModel, petstoreSales } from "../../fixtures";
import ModelProvider from "../../ModelProvider.svelte";
import Theme from "../Theme.harness.svelte";
import HealthReport from "./HealthReport.svelte";
import RelationshipDetail from "./RelationshipDetail.svelte";
import StrategicPositionTable from "./StrategicPositionTable.svelte";

/**
 * One evidence organism against the petstore, in one theme. Sales is the
 * context whose position fills all three groups at once, and the relationship
 * shown is the one the model marks for refactoring, so the disposition, the
 * comments and the crossings all have something to say.
 */
const {
	organism,
	mode = "light",
}: { organism: OrganismName; mode?: "light" | "dark" | "hc" } = $props();

const sales = petstoreSales();
const model = $derived(organism === "position" ? sales.model : petstoreModel());
const relationship = $derived(
	model.workspace.relationships.find((r) => dispositionOf(r) === "refactor") ??
		model.workspace.relationships[0],
);
</script>

<Theme {mode}>
	<ModelProvider {model}>
		{#if organism === "position"}
			<StrategicPositionTable context={sales.context} />
		{:else if organism === "relationship"}
			<RelationshipDetail {relationship} />
		{:else}
			<HealthReport />
		{/if}
	</ModelProvider>
</Theme>
