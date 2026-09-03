<script lang="ts">
import type { Subdomain } from "@open-domain-specification/core";
import Chip from "../atoms/Chip.svelte";
import Dim from "../atoms/Dim.svelte";
import Empty from "../atoms/Empty.svelte";
import { ICONS, SUBDOMAIN_TYPE } from "../model";
import Card from "./Card.svelte";
import ContextPill from "./ContextPill.svelte";

const { subdomain }: { subdomain: Subdomain } = $props();
const serving = $derived([...subdomain.boundedcontexts.values()]);
</script>

<Card ref={subdomain.ref} name={subdomain.name} icon={ICONS.subdomain} description={subdomain.description}>
	{#snippet meta()}
		<Chip label={subdomain.type} tone={subdomain.type} title={SUBDOMAIN_TYPE[subdomain.type]} />
	{/snippet}
	{#if serving.length}
		<p class="dim">Served by</p>
		<div class="pills">{#each serving as bc}<ContextPill context={bc} />{/each}</div>
	{:else}
		<Empty text="No bounded context serves this subdomain yet." />
	{/if}
</Card>
