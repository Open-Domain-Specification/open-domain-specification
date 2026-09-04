<script lang="ts">
import type { Kind } from "./kinds";
import Lockup from "./Lockup.svelte";

/**
 * The lockup as a page title and as rows. `dense` lays out every kind the
 * pages know as a list at the platform's row height, which is what a tree
 * view or a search result list looks like.
 */
const { dense = false }: { dense?: boolean } = $props();

const kinds: [Kind, string, string][] = [
	["workspace", "Swagger Petstore (v3)", "swagger_petstore_(v3)"],
	["domain", "Petstore Commerce", "petstore_commerce"],
	["subdomain", "Catalog", "catalog"],
	["boundedcontext", "Catalog BC", "catalog_bc"],
	["aggregate", "Pet", "pet"],
	["service", "PetApp", "pet_app"],
	["entity", "Pet", "pet"],
	["valueobject", "Category", "category"],
	["invariant", "NameRequired", "name_required"],
	["event", "PetRegistered", "pet_registered"],
	["command", "ReservePet", "reserve_pet"],
	["policy", "ReserveOnOrderApproved", "reserve_on_order_approved"],
	["term", "Available", "available"],
	["team", "Pet Shop Team", "pet_shop_team"],
	["schema", "PetId", "pet_id"],
];
</script>

{#if dense}
	<ul class="list">
		{#each kinds as [kind, name, id] (kind)}
			<li><Lockup {kind} {name} {id} ref="#/{id}" /></li>
		{/each}
	</ul>
{:else}
	<Lockup kind="boundedcontext" name="Catalog BC" id="catalog_bc" detail="Bounded context" size="title" />
	<ul class="list">
		<li><Lockup kind="aggregate" name="Pet" ref="#/pet" detail="1 entity, 4 value objects, 2 invariants" /></li>
		<li><Lockup kind="service" name="PetApp" ref="#/pet_app" detail="application service" /></li>
		<li><Lockup kind="entity" name="Pet" ref="#/pet/pet" id="pet" /></li>
		<li><Lockup kind="team" name="Pet Shop Team" /></li>
	</ul>
{/if}

<style>
	.list {
		list-style: none;
		margin: 8px 0 0;
		padding: 0;
		line-height: 22px;
	}
	li {
		padding: 0 8px;
	}
	li:hover {
		background: var(--vscode-list-hoverBackground);
	}
</style>
