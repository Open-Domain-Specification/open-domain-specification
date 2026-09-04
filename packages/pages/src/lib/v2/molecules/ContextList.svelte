<script lang="ts">
import type { BoundedContext } from "@open-domain-specification/core";
import Keyword from "../Keyword.svelte";
import ContextLockup from "./ContextLockup.svelte";
import Joined from "./Joined.svelte";

/**
 * The contexts named in one cell, comma-separated, as v1's `RefList` was but
 * without the pills. The empty word is a keyword, not a dimmed wrapper.
 */
const {
	contexts,
	empty = "none",
}: { contexts: BoundedContext[]; empty?: string } = $props();
</script>

<Joined>
	{#each contexts as bc (bc.ref)}<ContextLockup context={bc} />{:else}<Keyword text={empty} />{/each}
</Joined>
