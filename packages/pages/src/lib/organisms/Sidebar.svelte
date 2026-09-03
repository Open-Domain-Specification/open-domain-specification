<script lang="ts">
import Icon from "../atoms/Icon.svelte";
import Logo from "../atoms/Logo.svelte";
import { ICONS, useModel } from "../model";

/** Navigation standing in for the extension's tree view: domains, contexts and teams. */
const { current }: { current: string } = $props();
const { workspace } = useModel();
type Item = { ref: string; label: string; icon: string; children?: Item[] };
const items = $derived<Item[]>([
	...[...workspace.domains.values()].map((d) => ({
		ref: d.ref,
		label: d.name,
		icon: ICONS.domain,
		children: [...d.subdomains.values()].map((s) => ({
			ref: s.ref,
			label: s.name,
			icon: ICONS.subdomain,
		})),
	})),
	...[...workspace.boundedcontexts.values()].map((bc) => ({
		ref: bc.ref,
		label: bc.name,
		icon: ICONS.boundedcontext,
		children: [
			...[...bc.aggregates.values()].map((a) => ({
				ref: a.ref,
				label: a.name,
				icon: ICONS.aggregate,
			})),
			...[...bc.services.values()].map((s) => ({
				ref: s.ref,
				label: s.name,
				icon: ICONS.service,
			})),
		],
	})),
	...[...workspace.teams.values()].map((t) => ({
		ref: t.ref,
		label: t.name,
		icon: ICONS.team,
	})),
]);
const active = (ref: string) =>
	current === ref || current.startsWith(`${ref}/`);
</script>

{#snippet list(entries: Item[])}
	<ul>
		{#each entries as i}
			<li>
				<a href={i.ref} class:active={active(i.ref)}><Icon name={i.icon} /> {i.label}</a>
				{#if i.children?.length}{@render list(i.children)}{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<nav class="site-nav">
	<p class="toc-title brand"><Logo size={20} /><a href="#/">{workspace.name}</a></p>
	{@render list(items)}
</nav>
