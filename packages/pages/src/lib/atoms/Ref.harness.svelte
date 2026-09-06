<script lang="ts">
import { ICONS } from "../icons";
import Ref from "./Ref.svelte";

/** Inline links in running text, with and without a kind icon, and one that leaves the model. */
</script>

<p>
	Orders are placed against <Ref ref="#/boundedcontexts/catalog_bc" label="Catalog BC" icon={ICONS.boundedcontext} kind="boundedcontext" />
	and reserved through <Ref ref="#/boundedcontexts/catalog_bc/services/pet_app/provides/reserve_pet_for_order" label="ReservePetForOrder" icon={ICONS.command} kind="command" />;
	the projection in <Ref ref="#/boundedcontexts/inventory_bc" label="Inventory BC" /> conforms to
	<Ref ref="#/boundedcontexts/catalog_bc/aggregates/pet/consumables/pet_status_changed" label="PetStatusChanged" icon={ICONS.event} kind="event" />.
	The kernel lives in <Ref ref="https://example.com/packages/kernel" label="packages/kernel" icon="code" external title="code" />
	and the decision is <Ref ref="https://example.com/adr/14" label="ADR-014 Shrink the kernel" external />.
</p>

<style>
	p {
		max-width: 80ch;
		margin: 0;
		line-height: 1.5;
	}
</style>
