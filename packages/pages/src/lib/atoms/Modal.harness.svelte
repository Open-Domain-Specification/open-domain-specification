<script lang="ts">
import { untrack } from "svelte";
import Definition from "./Definition.svelte";
import DefinitionList from "./DefinitionList.svelte";
import Heading from "./Heading.svelte";
import Keyword from "./Keyword.svelte";
import Modal from "./Modal.svelte";
import Ref from "./Ref.svelte";

/**
 * The modal over a page that is still there behind it: a list above, the
 * panel centred over it, and a trigger that carries the disclosure's own
 * `aria-expanded`/`aria-controls`. Open by default so the story shows the
 * thing it is a story of. The links inside are here so the panel holds more
 * than one focusable, which is what the Tab ring is made of.
 */
const {
	open: initial = true,
	id = "modal-demo",
	title = "Relationship",
}: { open?: boolean; id?: string; title?: string } = $props();
let open = $state(untrack(() => initial));
const rows = [
	"Catalog BC — customer-supplier",
	"Inventory BC — shared-kernel",
	"Shipping BC — separate-ways",
];
</script>

<div class="demo">
	<Heading level={2}>Strategic position</Heading>
	<ul>
		{#each rows as row (row)}<li>{row}</li>{/each}
	</ul>
	<button
		type="button"
		aria-expanded={open}
		aria-controls={id}
		onclick={() => (open = !open)}
	>
		Evidence for Catalog BC and Sales BC
	</button>
</div>

<Modal showing={open ? "catalog-sales" : undefined} {id} {title} onclose={() => (open = false)}>
	<Heading level={3}>Catalog BC → Sales BC <Keyword text="customer-supplier" /></Heading>
	<DefinitionList>
		<Definition term="Upstream">Catalog BC <Keyword text="OHS" mono /></Definition>
		<Definition term="Downstream">Sales BC <Keyword text="ACL" mono /></Definition>
		<Definition term="Contract">
			<Ref ref="https://example.com/contract" label="Pet summary contract" external />
		</Definition>
		<Definition term="Runbook">
			<Ref ref="https://example.com/runbook" label="Catalog runbook" external />
		</Definition>
	</DefinitionList>
</Modal>

<style>
	/* The story needs a page under the modal for the scrim to dim. */
	.demo {
		min-height: 320px;
	}
	ul {
		margin: 8px 0;
		padding-left: 16px;
		line-height: 22px;
	}
</style>
