<script lang="ts">
import { type Consumable, PATTERNS } from "@open-domain-specification/core";
import Keyword from "../Keyword.svelte";

/**
 * How a consumable is classified, in words rather than pills: what it is,
 * whether it leaves its context, and the strategic pattern it is published
 * under. The pattern is a code from the pattern table, so it is set in the
 * editor font and carries its summary as hover text. `internal` is the only
 * one with a tone: a consumable nothing outside can reach is the sort of
 * fact the Problems panel would mark, not a neutral label.
 */
const { consumable: c }: { consumable: Consumable } = $props();
</script>

<Keyword text={c.type} />
{#if c.internal}<Keyword
		text="internal"
		tone="warn"
		title="Stays inside its context; other contexts cannot consume it."
	/>{/if}
{#if c.pattern}<Keyword text={c.pattern} mono title={PATTERNS[c.pattern].summary} />{/if}
