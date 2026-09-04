<script lang="ts">
import type { Diagnostic } from "@open-domain-specification/core";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import Section from "./Section.svelte";

/**
 * A context page's Strategic position section, the one that carries a count
 * and, when the model is incomplete, the diagnostics behind it. `problems`
 * adds one of each severity so both Problems-panel colours are on screen.
 */
const {
	problems = false,
	counted = true,
}: { problems?: boolean; counted?: boolean } = $props();

const diagnostics: Diagnostic[] = [
	{
		severity: "warning",
		rule: "relationship-has-no-comments",
		message: "Sales BC → Inventory BC has no comments.",
		ref: "#/relationships/sales_bc~upstream-downstream~inventory_bc",
	},
	{
		severity: "error",
		rule: "aggregate-root",
		message: "Inventory Projection has no root entity.",
		ref: "#/boundedcontexts/inventory_bc/aggregates/inventory_projection",
	},
];
</script>

<Section
	id="position"
	title="Strategic position"
	lead="Who this context depends on and who depends on it, and what each of those relationships is meant to be."
	count={counted ? 5 : undefined}
	problems={problems ? diagnostics : []}
>
	<p class="body">
		<Lockup kind="boundedcontext" name="Catalog BC" ref="#/boundedcontexts/catalog_bc" />
		<Keyword text="customer-supplier" />
	</p>
</Section>

<style>
	.body {
		margin: 0;
		padding: 0 8px;
		line-height: 22px;
	}
</style>
