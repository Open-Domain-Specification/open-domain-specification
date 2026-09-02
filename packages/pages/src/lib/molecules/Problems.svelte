<script lang="ts">
import type { Diagnostic } from "@open-domain-specification/core";
import Icon from "../atoms/Icon.svelte";
import RefLink from "../atoms/RefLink.svelte";

const { problems }: { problems: Diagnostic[] } = $props();
</script>

{#if problems.length}
	<ul class="problems">
		{#each problems as d}
			<li class={d.severity}>
				<Icon name={d.severity} />
				<span class="rule">{d.rule}</span>
				{d.message}
				<RefLink ref={d.ref} label="go to" />
			</li>
		{/each}
	</ul>
{/if}
