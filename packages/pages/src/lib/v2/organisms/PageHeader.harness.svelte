<script lang="ts">
import Definition from "../Definition.svelte";
import Keyword from "../Keyword.svelte";
import Lockup from "../Lockup.svelte";
import PageHeader from "./PageHeader.svelte";

/**
 * The Pet aggregate's header, the fullest version: crumbs, a title lockup
 * carrying the id and the kind word, a description, the classifying keywords
 * v1 put beside the title, and the facts strip as a definition list.
 * `bare` is the other end — a workspace page, which has no crumbs, no facts
 * and no description.
 */
const { bare = false }: { bare?: boolean } = $props();
</script>

{#if bare}
	<PageHeader kind="workspace" name="Swagger Petstore (v3)" id="petstore" />
{:else}
	<PageHeader
		kind="aggregate"
		kindLabel="Aggregate"
		name="Pet"
		id="pet"
		description="A pet listed in the store. One aggregate because a pet's status, category and tags change together and must stay consistent."
		crumbs={[["#", "Swagger Petstore (v3)"], ["#/boundedcontexts/catalog_bc", "Catalog BC"]]}
	>
		{#snippet meta()}
			<Keyword text="big ball of mud" tone="warn" title="A model that is not coherent; neighbours should protect themselves with an anti-corruption layer." />
		{/snippet}
		{#snippet facts()}
			<Definition term="Root">
				<Lockup kind="entity" name="Pet" ref="#/boundedcontexts/catalog_bc/aggregates/pet/entities/pet" />
			</Definition>
			<Definition term="Context">
				<Lockup kind="boundedcontext" name="Catalog BC" ref="#/boundedcontexts/catalog_bc" />
			</Definition>
		{/snippet}
	</PageHeader>
{/if}
