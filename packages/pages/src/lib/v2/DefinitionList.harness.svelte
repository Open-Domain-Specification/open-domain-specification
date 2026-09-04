<script lang="ts">
import Definition from "./Definition.svelte";
import DefinitionList from "./DefinitionList.svelte";
import Disposition from "./Disposition.svelte";
import Keyword from "./Keyword.svelte";
import Lockup from "./Lockup.svelte";

/** The facts under an aggregate's title; `dense` adds the facts a relationship would carry, to show a long list keeps its rhythm. */
const { dense = false }: { dense?: boolean } = $props();
</script>

<DefinitionList>
	<Definition term="Root"><Lockup kind="entity" name="Pet" ref="#/pet" /></Definition>
	<Definition term="Context"><Lockup kind="boundedcontext" name="Catalog BC" ref="#/catalog_bc" /></Definition>
	<Definition term="Owned by"><Lockup kind="team" name="Pet Shop Team" ref="#/pet_shop_team" /></Definition>
	<Definition term="Identity"><code>petId</code></Definition>
	{#if dense}
		<Definition term="Type"><Keyword text="customer-supplier" title="Upstream plans with the downstream's needs in mind." /></Definition>
		<Definition term="Upstream role"><Keyword text="OHS" mono /> <Keyword text="PL" mono /></Definition>
		<Definition term="Downstream role"><Keyword text="ACL" mono /></Definition>
		<Definition term="Disposition"><Disposition disposition="refactor" /></Definition>
		<Definition term="Decision"><a href="https://example.com/adr/14">ADR-014 Shrink the kernel</a></Definition>
		<Definition term="Code"><a href="https://example.com/kernel">packages/kernel/src/PetStatus.ts</a></Definition>
	{/if}
</DefinitionList>
