<script lang="ts">
import type { Attribute } from "@open-domain-specification/core";
import Icon from "../atoms/Icon.svelte";
import RefLink from "../atoms/RefLink.svelte";

let { attributes }: { attributes: Iterable<Attribute> } = $props();
const rows = $derived([...attributes]);
</script>

{#if rows.length}
	<table class="attrs">
		<thead><tr><th></th><th>Attribute</th><th>Type</th><th>Description</th></tr></thead>
		<tbody>
			{#each rows as a}
				<tr id={a.ref}>
					<td class="k">{#if a.identity}<span title="identity"><Icon name="key" /></span>{/if}</td>
					<td>{a.name}</td>
					<td><code>{#if a.valueobject}<RefLink ref={a.valueobject.ref} label={a.type} />{:else}{a.type}{/if}</code></td>
					<td>{a.description ?? ""}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
