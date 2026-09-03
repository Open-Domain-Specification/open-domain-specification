<script lang="ts">
import type { Consumable } from "@open-domain-specification/core";
import Chip from "../atoms/Chip.svelte";

/** Kind, visibility and role chips for a consumable. */
let { consumable: c }: { consumable: Consumable } = $props();
</script>

<Chip label={c.type} tone="muted" />
{#if c.internal}<Chip label="internal" tone="warn" title="Stays inside its context; other contexts cannot consume it." />{/if}
{#if c.pattern}<Chip label={c.pattern} tone="muted" />{/if}
