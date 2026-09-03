<script lang="ts">
import type { BoundedContext } from "@open-domain-specification/core";
import Chip from "../atoms/Chip.svelte";
import RefLink from "../atoms/RefLink.svelte";
import { ICONS } from "../model";

const {
	context,
	title,
}: {
	context: BoundedContext;
	/** Hover text for the whole pill; the strategic position puts its generated sentence here. */
	title?: string;
} = $props();
</script>

<span class="pill" {title}>
	<RefLink ref={context.ref} label={context.name} icon={ICONS.boundedcontext} />
	{#if context.bigBallOfMud}<Chip label="big ball of mud" tone="warn" />{/if}
</span>
