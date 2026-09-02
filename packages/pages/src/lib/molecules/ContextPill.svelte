<script lang="ts">
import type { BoundedContext } from "@open-domain-specification/core";
import Chip from "../atoms/Chip.svelte";
import RefLink from "../atoms/RefLink.svelte";
import { ICONS } from "../model";

const { context }: { context: BoundedContext } = $props();
</script>

<span class="pill">
	<RefLink ref={context.ref} label={context.name} icon={ICONS.boundedcontext} />
	{#if context.bigBallOfMud}<Chip label="big ball of mud" tone="warn" />{/if}
</span>
