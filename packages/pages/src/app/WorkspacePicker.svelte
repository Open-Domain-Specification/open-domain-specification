<script lang="ts">
import Icon from "../lib/atoms/Icon.svelte";
import Logo from "../lib/atoms/Logo.svelte";
import { ICONS, type Model } from "../lib/model";

/** Landing page of a multi-file export: one entry per workspace file. */
let { models, onpick }: { models: Model[]; onpick: (index: number) => void } =
	$props();
/** Picking keeps whatever hash the visitor arrived with, so deep links into an export survive. */
const keep = location.hash.length > 2 ? location.hash : "#/";
</script>

<div class="layout">
	<main>
		<h1 class="brand"><Logo size={32} /> Domain Model</h1>
		<ul class="site-index">
			{#each models as m, i}
				<li><a class="ref" href={keep} onclick={() => onpick(i)}><Icon name={ICONS.workspace} /> {m.workspace.name}</a> <span class="dim">{m.fileLabel}</span></li>
			{/each}
		</ul>
	</main>
</div>

<style>
	.brand { display: flex; align-items: center; gap: 10px; }
</style>
