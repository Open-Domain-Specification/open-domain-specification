<script lang="ts">
import type { Team } from "@open-domain-specification/core";
import Keyword from "../Keyword.svelte";
import Lockup from "../Lockup.svelte";

/**
 * Who owns the thing in this row: the team lockup, or the plain words that
 * say nobody does. v1's `TeamLine` dimmed the empty case with a wrapper; a
 * keyword is the secondary colour on its own.
 */
const { team }: { team?: Team } = $props();
</script>

{#if team}<Lockup kind="team" name={team.name} ref={team.ref} />{:else}<Keyword text="no owning team" />{/if}
