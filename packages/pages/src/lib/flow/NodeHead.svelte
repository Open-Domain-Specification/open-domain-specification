<script lang="ts">
import Icon from "../atoms/Icon.svelte";

/** The top of a node card: icon and name, then the cluster path as a subtitle. */
let {
	icon,
	name,
	subtitle = undefined,
}: { icon: string; name: string; subtitle?: string } = $props();
</script>

<div class="head"><Icon name={icon} /> <strong>{name}</strong></div>
{#if subtitle}<div class="group">{subtitle}</div>{/if}
