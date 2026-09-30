<script lang="ts">
import {
	type ContextRelationship,
	RELATIONSHIP_NAME_SEPARATOR,
	relationshipArrow,
} from "@open-domain-specification/core";
import ContextLockup from "./ContextLockup.svelte";

/**
 * A relationship named as core's `relationshipTitle` names it, with each
 * context its own lockup: source, the arrow, target and, for a named
 * agreement, its name after the middle dot. One pair may hold two agreements
 * (decision 15), and the name is what tells their pages apart (#74).
 *
 * It draws its parts as siblings, not inside a wrapper, so a flex heading
 * spaces them with its own gap and a table cell with its own words; the
 * glyphs are in the secondary colour either way.
 */
const { relationship: r }: { relationship: ContextRelationship } = $props();
/** Keeps the dot on the name's line: a wrapped title never ends in a bare "·". */
const NO_BREAK = "\u00a0";
</script>

<ContextLockup context={r.source} />
<span class="arrow">{relationshipArrow(r.type)}</span>
<ContextLockup context={r.target} />
{#if r.name}
	<span class="agreement"><span class="separator">{RELATIONSHIP_NAME_SEPARATOR.trim()}</span>{NO_BREAK}{r.name}</span>
{/if}

<style>
	.arrow,
	.separator {
		color: var(--vscode-descriptionForeground);
	}
</style>
