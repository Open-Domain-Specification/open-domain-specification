<script lang="ts">
import {
	type Disposition,
	DISPOSITION_LABELS,
	DISPOSITION_SUMMARIES,
} from "../evidence/fixtures";
import Chip from "./Chip.svelte";

/**
 * What the architecture thinks of one intent. By design is the default and
 * says nothing a reader needs, so it renders nothing at all; only a tolerated
 * compromise or something marked for refactoring earns a chip. Refactor takes
 * the warning tone, tolerated the plain outline.
 */
const { disposition }: { disposition?: Disposition } = $props();
</script>

{#if disposition && disposition !== "by-design"}
	<Chip
		label={DISPOSITION_LABELS[disposition]}
		tone={disposition === "refactor" ? "warn" : ""}
		title={DISPOSITION_SUMMARIES[disposition]}
	/>
{/if}
