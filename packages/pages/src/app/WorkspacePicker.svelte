<script lang="ts">
import Icon from "../lib/atoms/Icon.svelte";
import { ICONS, type Model } from "../lib/model";

/** Landing page of a multi-file export: one entry per workspace file. */
let { models, onpick }: { models: Model[]; onpick: (index: number) => void } =
	$props();
</script>

<div class="layout">
	<main>
		<h1>Domain Model</h1>
		<ul class="site-index">
			{#each models as m, i}
				<li><a class="ref" href="#/" onclick={() => onpick(i)}><Icon name={ICONS.workspace} /> {m.workspace.name}</a> <span class="dim">{m.fileLabel}</span></li>
			{/each}
		</ul>
	</main>
</div>
