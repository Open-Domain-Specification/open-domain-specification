<script lang="ts">
import Icon from "../lib/atoms/Icon.svelte";
import Logo from "../lib/atoms/Logo.svelte";
import type { Loaded } from "../lib/load";
import { ICONS } from "../lib/model";

/** Landing page of an export that holds several things to read: one entry per workspace opened alone, and one per set of files. */
let {
	entries,
	onpick,
}: { entries: Loaded[]; onpick: (index: number) => void } = $props();
/** Picking keeps whatever hash the visitor arrived with, so deep links into an export survive. */
const workspaces = (n: number) =>
	`${n} ${n === 1 ? "workspace" : "workspaces"}`;
const keep = location.hash.length > 1 ? location.hash : "#";
</script>

<div class="screen">
	<main>
		<h1 class="brand"><Logo size={32} /> Domain Model</h1>
		<ul class="site-index">
			{#each entries as entry, i}
				{#if entry.kind === "workspace"}
					<li><a class="ref" href={keep} onclick={() => onpick(i)}><Icon name={ICONS.workspace} /> {entry.model.workspace.name}</a> <span class="dim">{entry.model.fileLabel}</span></li>
				{:else}
					<li><a class="ref" href={keep} onclick={() => onpick(i)}><Icon name={ICONS.workspace} /> {workspaces(entry.loaded.files.length)}</a> <span class="dim">{entry.loaded.files.map((f) => f.fileLabel).join(", ")}</span></li>
				{/if}
			{/each}
		</ul>
	</main>
</div>

<style>
	.brand { display: flex; align-items: center; gap: 10px; }
</style>
