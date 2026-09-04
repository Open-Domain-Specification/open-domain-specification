<script lang="ts">
import { untrack } from "svelte";
import BottomSheet from "./BottomSheet.svelte";
import Definition from "./Definition.svelte";
import DefinitionList from "./DefinitionList.svelte";
import Heading from "./Heading.svelte";
import Keyword from "./Keyword.svelte";

/**
 * The sheet over a page that is still readable: a list above, the panel
 * docked under it, and a trigger that carries the disclosure's own
 * `aria-expanded`/`aria-controls`. Open by default so the story shows the
 * thing it is a story of.
 */
const {
	open: initial = true,
	id = "sheet-demo",
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

<BottomSheet showing={open ? "catalog-sales" : undefined} {id} {title} onclose={() => (open = false)}>
	<Heading level={3}>Catalog BC → Sales BC <Keyword text="customer-supplier" /></Heading>
	<DefinitionList>
		<Definition term="Upstream">Catalog BC <Keyword text="OHS" mono /></Definition>
		<Definition term="Downstream">Sales BC <Keyword text="ACL" mono /></Definition>
	</DefinitionList>
</BottomSheet>

<style>
	/* The story needs something under the sheet to be docked against. */
	.demo {
		min-height: 320px;
	}
	ul {
		margin: 8px 0;
		padding-left: 16px;
		line-height: 22px;
	}
</style>
