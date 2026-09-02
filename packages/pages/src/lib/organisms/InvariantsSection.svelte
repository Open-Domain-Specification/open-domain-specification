<script lang="ts">
import type { Invariant } from "@open-domain-specification/core";
import Empty from "../atoms/Empty.svelte";
import { ICONS } from "../model";
import Card from "../molecules/Card.svelte";
import Section from "./Section.svelte";

/** "Constrained by": the invariants that name an entity or value object explicitly. */
let {
	invariants,
	lead,
	emptyText,
}: { invariants: Invariant[]; lead: string; emptyText: string } = $props();
</script>

<Section id="invariants" title="Constrained by" {lead}>
	{#each invariants as i}
		<Card ref={i.ref} name={i.name} icon={ICONS.invariant} description={i.description} />
	{:else}
		<Empty text={emptyText} />
	{/each}
</Section>
