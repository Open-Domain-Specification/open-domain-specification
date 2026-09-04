<script lang="ts">
import Definition from "../atoms/Definition.svelte";
import DefinitionList from "../atoms/DefinitionList.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import PageHeader from "./PageHeader.svelte";

/**
 * The page header in its two shapes: a page deep in the model, with a trail,
 * a classifying word and a fact or two, and a page at the root with none of
 * them.
 */
const { bare = false }: { bare?: boolean } = $props();
</script>

{#if bare}
	<PageHeader>
		{#snippet title()}<Lockup kind="workspace" name="Swagger Petstore (v3)" size="title" />{/snippet}
	</PageHeader>
{:else}
	<PageHeader
		crumbs={[["#", "Swagger Petstore (v3)"], ["#/domains/petstore_commerce", "Petstore Commerce"]]}
		description="Pet definitions, attributes and lifecycle."
	>
		{#snippet title()}<Lockup kind="subdomain" name="Catalog" id="catalog" detail="Subdomain" size="title" />{/snippet}
		{#snippet meta()}<Keyword text="core" title="Core: the differentiator." />{/snippet}
		{#snippet facts()}
			<DefinitionList>
				<Definition term="Classification">Core: the differentiator.</Definition>
			</DefinitionList>
		{/snippet}
	</PageHeader>
{/if}
