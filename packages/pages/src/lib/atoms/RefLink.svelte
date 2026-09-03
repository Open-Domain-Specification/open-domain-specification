<script lang="ts">
import Icon from "./Icon.svelte";

/** A link to another element. The ref doubles as the hash route, so plain navigation works in every host. */
const { ref, label, icon }: { ref: string; label: string; icon?: string } =
	$props();
</script>

<a class="ref" href={ref} data-ref={ref}>{#if icon}<Icon name={icon} />{" "}{/if}{label}</a>
