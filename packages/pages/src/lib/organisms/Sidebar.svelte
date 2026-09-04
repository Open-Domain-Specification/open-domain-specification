<script lang="ts">
import type { Kind } from "../atoms/kinds";
import Lockup from "../atoms/Lockup.svelte";
import Logo from "../atoms/Logo.svelte";
import { useModel } from "../model";

/**
 * The static site's navigation, standing in for the extension's tree view.
 * It is already a tree, so v2 only makes it the workbench's tree: 22px rows,
 * 16px of indent per level, the brand line in body text rather than tracked
 * capitals, and selection drawn with `list.activeSelection*` instead of the
 * link colour — a selected row in VS Code is a filled row, not a coloured word.
 *
 * The webview never renders this; the tree view is the navigation there.
 */
const { current }: { current: string } = $props();

const { workspace } = useModel();
type Item = { ref: string; label: string; kind: Kind; children?: Item[] };
const items = $derived<Item[]>([
	...[...workspace.domains.values()].map((d) => ({
		ref: d.ref,
		label: d.name,
		kind: "domain" as Kind,
		children: [...d.subdomains.values()].map((s) => ({
			ref: s.ref,
			label: s.name,
			kind: "subdomain" as Kind,
		})),
	})),
	...[...workspace.boundedcontexts.values()].map((bc) => ({
		ref: bc.ref,
		label: bc.name,
		kind: "boundedcontext" as Kind,
		children: [
			...[...bc.aggregates.values()].map((a) => ({
				ref: a.ref,
				label: a.name,
				kind: "aggregate" as Kind,
			})),
			...[...bc.services.values()].map((s) => ({
				ref: s.ref,
				label: s.name,
				kind: "service" as Kind,
			})),
		],
	})),
	...[...workspace.teams.values()].map((t) => ({
		ref: t.ref,
		label: t.name,
		kind: "team" as Kind,
	})),
]);
const active = (ref: string) =>
	current === ref || current.startsWith(`${ref}/`);
</script>

{#snippet list(entries: Item[])}
	<ul>
		{#each entries as i (i.ref)}
			<li>
				<span class="item" class:active={active(i.ref)}>
					<Lockup kind={i.kind} name={i.label} ref={i.ref} />
				</span>
				{#if i.children?.length}{@render list(i.children)}{/if}
			</li>
		{/each}
	</ul>
{/snippet}

<nav class="tree">
	<p class="brand"><Logo size={16} /><a href="#/">{workspace.name}</a></p>
	{@render list(items)}
</nav>

<style>
	.tree {
		font-size: inherit;
	}
	/* The brand line is body text, not a tracked capital title. */
	.brand {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0 0 4px;
		padding: 0 8px;
		line-height: 22px;
		font-size: inherit;
		text-transform: none;
		letter-spacing: normal;
		color: var(--vscode-foreground);
	}
	.brand a {
		color: inherit;
		text-decoration: none;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	/* The workbench tree indents 16px per level; v1 used 14px. */
	ul ul {
		padding-left: 16px;
	}
	.item {
		display: block;
		padding: 0 8px;
		line-height: 22px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		border-radius: 0;
	}
	.item:hover {
		background: var(--vscode-list-hoverBackground);
	}
	/* No `list.activeSelection*` on a host means the hover wash and the plain
	   foreground, which is what section 5's fallback column asks for. */
	.item.active {
		background: var(
			--vscode-list-activeSelectionBackground,
			var(--vscode-list-hoverBackground)
		);
	}
	.item.active :global(.name),
	.item.active :global(.ref) {
		color: var(
			--vscode-list-activeSelectionForeground,
			var(--vscode-foreground)
		);
	}
	/* High contrast draws selection and hover as an outline, not a wash. */
	:global(.vscode-high-contrast) .item:hover,
	:global(.vscode-high-contrast) .item.active {
		outline: 1px dashed var(--vscode-contrastActiveBorder);
		outline-offset: -1px;
	}
</style>
