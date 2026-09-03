<script lang="ts">
import type { Team } from "@open-domain-specification/core";
import Dim from "../atoms/Dim.svelte";
import RefLink from "../atoms/RefLink.svelte";
import { ICONS } from "../model";

const { team }: { team: Team | undefined } = $props();
</script>

{#if team}<RefLink ref={team.ref} label={team.name} icon={ICONS.team} />{:else}<Dim>no owning team</Dim>{/if}
